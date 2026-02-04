"""Config flow for emonPi/Tx Configuration integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult

from .const import DOMAIN, CONF_ESPHOME_DEVICE

_LOGGER = logging.getLogger(__name__)


class ConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for emonPi/Tx Configuration."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        # Check if already configured
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        # Auto-discover devices and use first one as default
        esphome_devices = await self._get_esphome_devices()
        default_device = esphome_devices[0] if esphome_devices else ""

        return self.async_create_entry(
            title="emonPi/Tx Configuration",
            data={CONF_ESPHOME_DEVICE: default_device},
        )

    async def _get_esphome_devices(self) -> list[str]:
        """Get list of ESPHome devices that have send_command service."""
        devices = []

        # Look for ESPHome services with send_command
        services = self.hass.services.async_services()
        esphome_services = services.get("esphome", {})

        for service_name in esphome_services:
            if service_name.endswith("_send_command"):
                # Extract device name from service
                device_name = service_name.replace("_send_command", "")
                devices.append(device_name)

        if not devices:
            # Return placeholder if no devices found
            devices = ["emontx_config"]

        return devices

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Create the options flow."""
        return OptionsFlowHandler()


class OptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for emonPi/Tx Configuration."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_ESPHOME_DEVICE,
                        default=self.config_entry.data.get(CONF_ESPHOME_DEVICE, ""),
                    ): str,
                }
            ),
        )
