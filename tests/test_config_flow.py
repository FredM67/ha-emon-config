"""Test the emonPi/Tx Configuration config flow."""
import pytest
from unittest.mock import patch

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.emontx_config.const import DOMAIN


async def test_user_flow_creates_entry(hass: HomeAssistant, mock_setup_entry):
    """Test user flow creates config entry."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )

    assert result["type"] == FlowResultType.CREATE_ENTRY
    assert result["title"] == "emonPi/Tx Configuration"
    assert result["data"] == {}
    assert len(mock_setup_entry.mock_calls) == 1


async def test_single_instance_only(hass: HomeAssistant, mock_setup_entry):
    """Test only one instance allowed via single_config_entry manifest option."""
    # Create first entry
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] == FlowResultType.CREATE_ENTRY

    # Try to create second - should abort due to single_config_entry
    result2 = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result2["type"] == FlowResultType.ABORT
    assert result2["reason"] == "single_instance_allowed"
