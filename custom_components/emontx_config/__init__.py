"""emonPi/Tx Configuration integration for Home Assistant.

This integration provides a web-based configuration interface for OpenEnergyMonitor
emonTx devices connected via an ESP32 serial bridge running ESPHome.
"""
from __future__ import annotations

import logging
import os
from typing import Any

from homeassistant.components import frontend, websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers.typing import ConfigType
import voluptuous as vol

from .const import DOMAIN, EVENT_EMONTX_RAW

# Key for storing channel names in config entry options
CONF_CHANNEL_NAMES = "channel_names"

# Flags to track if commands/services have been registered
WEBSOCKET_REGISTERED = "websocket_registered"
SERVICE_REGISTERED = "service_registered"

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = []


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the emonPi/Tx Configuration component."""
    # Clear domain data on (re)load to ensure fresh registration of services/websocket
    hass.data[DOMAIN] = {}
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up emonPi/Tx Configuration from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    # Register WebSocket commands once (on first config entry setup)
    if not hass.data[DOMAIN].get(WEBSOCKET_REGISTERED):
        websocket_api.async_register_command(hass, websocket_get_channel_names)
        websocket_api.async_register_command(hass, websocket_save_channel_names)
        hass.data[DOMAIN][WEBSOCKET_REGISTERED] = True

    # Store entry data
    hass.data[DOMAIN][entry.entry_id] = {
        "last_data": None,
    }

    # Register the frontend panel
    await _async_register_panel(hass, entry)

    # Set up event listener for emonTx data
    @callback
    def handle_emontx_data(event):
        """Handle emonTx data events from ESPHome."""
        hass.data[DOMAIN][entry.entry_id]["last_data"] = event.data
        _LOGGER.debug("Received emonTx data: %s", event.data)

    # Listen for ESPHome events
    entry.async_on_unload(
        hass.bus.async_listen(EVENT_EMONTX_RAW, handle_emontx_data)
    )

    # Register service to send commands (only once)
    if not hass.data[DOMAIN].get(SERVICE_REGISTERED):
        async def send_command(call: ServiceCall) -> None:
            """Send a command to the emonTx via ESPHome."""
            command = call.data.get("command", "")
            device = call.data.get("device", "")

            if not device:
                _LOGGER.error("No ESPHome device specified in service call")
                return

            # Call the ESPHome service
            await hass.services.async_call(
                "esphome",
                f"{device}_send_command",
                {"command": command},
                blocking=True,
            )
            _LOGGER.debug("Sent command to %s: %s", device, command)

        hass.services.async_register(DOMAIN, "send_command", send_command)
        hass.data[DOMAIN][SERVICE_REGISTERED] = True

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    # Remove the frontend panel
    frontend.async_remove_panel(hass, "emontx-config")

    # Remove stored data for this entry
    hass.data[DOMAIN].pop(entry.entry_id, None)

    # Check if this was the last entry
    remaining_entries = [
        eid for eid in hass.data[DOMAIN]
        if eid not in (WEBSOCKET_REGISTERED, SERVICE_REGISTERED)
    ]
    if not remaining_entries:
        # Unregister service when last entry is removed
        hass.services.async_remove(DOMAIN, "send_command")
        hass.data[DOMAIN][SERVICE_REGISTERED] = False

    return True


async def _async_register_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Register the frontend panel."""
    from homeassistant.components.http import StaticPathConfig

    # Get the path to the frontend files
    frontend_path = os.path.join(os.path.dirname(__file__), "frontend")

    # Register static path for frontend files
    await hass.http.async_register_static_paths(
        [StaticPathConfig("/emontx_config_static", frontend_path, cache_headers=False)]
    )

    # Register the panel
    frontend.async_register_built_in_panel(
        hass,
        component_name="iframe",
        sidebar_title="emonPi/Tx Config",
        sidebar_icon="mdi:lightning-bolt",
        frontend_url_path="emontx-config",
        config={"url": "/emontx_config_static/panel.html"},
        require_admin=True,
    )

    _LOGGER.info("emonPi/Tx Configuration panel registered")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "emontx_config/get_channel_names",
    }
)
@callback
def websocket_get_channel_names(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get channel names from config entry options."""
    # Find the config entry
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        connection.send_error(msg["id"], "not_found", "No config entry found")
        return

    entry = entries[0]
    channel_names = entry.options.get(CONF_CHANNEL_NAMES, {})

    connection.send_result(msg["id"], {"channel_names": channel_names})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "emontx_config/save_channel_names",
        vol.Required("channel_names"): dict,
    }
)
@websocket_api.async_response
async def websocket_save_channel_names(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save channel names to config entry options."""
    # Find the config entry
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        connection.send_error(msg["id"], "not_found", "No config entry found")
        return

    entry = entries[0]
    channel_names = msg["channel_names"]

    # Merge with existing options
    new_options = dict(entry.options)
    new_options[CONF_CHANNEL_NAMES] = channel_names

    # Update the config entry options
    hass.config_entries.async_update_entry(entry, options=new_options)

    _LOGGER.debug("Saved channel names: %s", channel_names)
    connection.send_result(msg["id"], {"success": True})
