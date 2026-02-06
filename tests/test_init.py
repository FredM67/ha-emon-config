"""Test the emonPi/Tx Configuration integration setup."""
import pytest
from unittest.mock import patch, AsyncMock

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntryState
from homeassistant.setup import async_setup_component

from custom_components.emontx_config.const import DOMAIN


@pytest.fixture
def mock_panel_registration():
    """Mock panel registration."""
    with patch(
        "custom_components.emontx_config._async_register_panel",
        return_value=None,
    ) as mock:
        yield mock


async def test_setup_entry(hass: HomeAssistant, mock_panel_registration):
    """Test setting up the integration."""
    # Setup the integration
    assert await async_setup_component(hass, DOMAIN, {})
    await hass.async_block_till_done()

    # Create a config entry
    entry = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": "user"}
    )
    await hass.async_block_till_done()

    # Check entry was created
    entries = hass.config_entries.async_entries(DOMAIN)
    assert len(entries) == 1
    assert entries[0].state == ConfigEntryState.LOADED


async def test_unload_entry(hass: HomeAssistant, mock_panel_registration):
    """Test unloading the integration."""
    with patch(
        "homeassistant.components.frontend.async_remove_panel"
    ) as mock_remove:
        # Setup
        assert await async_setup_component(hass, DOMAIN, {})
        await hass.async_block_till_done()

        # Create entry
        await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": "user"}
        )
        await hass.async_block_till_done()

        entries = hass.config_entries.async_entries(DOMAIN)
        assert len(entries) == 1

        # Unload
        await hass.config_entries.async_unload(entries[0].entry_id)
        await hass.async_block_till_done()

        # Check panel was removed
        mock_remove.assert_called_once_with(hass, "emontx-config")


async def test_service_registration(hass: HomeAssistant, mock_panel_registration):
    """Test that send_command service is registered."""
    assert await async_setup_component(hass, DOMAIN, {})
    await hass.async_block_till_done()

    await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": "user"}
    )
    await hass.async_block_till_done()

    # Check service is registered
    assert hass.services.has_service(DOMAIN, "send_command")
