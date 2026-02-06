"""Fixtures for emonPi/Tx Configuration tests."""
import sys
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock

import pytest

# Add custom_components to path so pytest can find our integration
sys.path.insert(0, str(Path(__file__).parent.parent))

from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from custom_components.emontx_config.const import DOMAIN


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Enable custom integrations for all tests."""
    yield


@pytest.fixture(autouse=True)
def mock_esphome_dependency(hass: HomeAssistant):
    """Mock the ESPHome integration dependency."""
    # Mark esphome as already set up to avoid loading its complex dependencies
    hass.config.components.add("esphome")
    yield


@pytest.fixture
def mock_setup_entry():
    """Mock async_setup_entry."""
    with patch(
        "custom_components.emontx_config.async_setup_entry",
        return_value=True,
    ) as mock:
        yield mock


@pytest.fixture
def mock_esphome_service(hass: HomeAssistant):
    """Mock ESPHome send_command service."""
    async def mock_call(*args, **kwargs):
        pass

    hass.services.async_register(
        "esphome",
        "emonwifi_send_command",
        mock_call
    )
    return "emonwifi"
