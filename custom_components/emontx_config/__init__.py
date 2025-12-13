"""emonTx Configuration integration for Home Assistant.

This integration provides a web-based configuration interface for OpenEnergyMonitor
emonTx devices connected via an ESP32 serial bridge running ESPHome.
"""
from __future__ import annotations

import logging
import os
from typing import Any

from homeassistant.components import frontend
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, EVENT_EMONTX_DATA, CONF_ESPHOME_DEVICE

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = []


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the emonTx Configuration component."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up emonTx Configuration from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    esphome_device = entry.data.get(CONF_ESPHOME_DEVICE, "")

    # Store configuration
    hass.data[DOMAIN][entry.entry_id] = {
        "esphome_device": esphome_device,
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
        hass.bus.async_listen(EVENT_EMONTX_DATA, handle_emontx_data)
    )

    # Register service to send commands
    async def send_command(call: ServiceCall) -> None:
        """Send a command to the emonTx via ESPHome."""
        command = call.data.get("command", "")
        device = call.data.get("device", esphome_device)

        if not device:
            _LOGGER.error("No ESPHome device specified")
            return

        # Call the ESPHome service
        service_name = f"esphome.{device}_send_command"
        await hass.services.async_call(
            "esphome",
            f"{device}_send_command",
            {"command": command},
            blocking=True,
        )
        _LOGGER.debug("Sent command to %s: %s", device, command)

    hass.services.async_register(DOMAIN, "send_command", send_command)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    # Remove the frontend panel
    frontend.async_remove_panel(hass, "emontx-config")

    # Remove stored data
    hass.data[DOMAIN].pop(entry.entry_id, None)

    return True


async def _async_register_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Register the frontend panel."""
    # Get the path to the frontend files
    frontend_path = os.path.join(os.path.dirname(__file__), "frontend")

    # Register static path for frontend files
    hass.http.register_static_path(
        "/emontx_config_static",
        frontend_path,
        cache_headers=False,
    )

    # Register the panel
    frontend.async_register_built_in_panel(
        hass,
        component_name="iframe",
        sidebar_title="emonTx Config",
        sidebar_icon="mdi:lightning-bolt",
        frontend_url_path="emontx-config",
        config={"url": "/emontx_config_static/panel.html"},
        require_admin=True,
    )

    _LOGGER.info("emonTx Configuration panel registered")
