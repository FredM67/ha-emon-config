# emonPi/Tx Configuration for Home Assistant

[![GitHub Release](https://img.shields.io/github/v/release/FredM67/ha-emon-config)](https://github.com/FredM67/ha-emon-config/releases)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=FredM67&repository=ha-emon-config&category=integration)

A Home Assistant integration that provides a web-based configuration interface for OpenEnergyMonitor emonPi/Tx devices connected via an ESP32 serial bridge running ESPHome.

## Features

- **Device Configuration**: Full configuration interface for CT calibration, voltage calibration, radio settings, and more
- **Serial Terminal**: Send commands and receive responses from your emonTx device
- **Live Data Display**: View real-time power and energy readings from all channels
- **Zero Energy**: Reset energy counters with confirmation countdown (matching firmware behavior)
- **Multi-phase Support**: Full support for emonPi3 with 3-phase voltage monitoring

## Requirements

- Home Assistant 2023.1.0 or newer
- An ESP32 running ESPHome with the [emonTx component](https://github.com/FredM67/esphome) configured
- An emonTx device connected to the ESP32 via UART

## Installation

### With HACS (Recommended)

1. Install the integration through HACS using the button below or by adding `https://github.com/FredM67/ha-emon-config` to HACS as a custom repository.

   [![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=FredM67&repository=ha-emon-config&category=integration)

2. Restart Home Assistant
3. Go to Settings > Devices & Services > Add Integration > Search for "emonPi/Tx Configuration"

### Manual Installation

1. Download this repository
2. Copy the `custom_components/emontx_config` folder to your Home Assistant `config/custom_components/` directory
3. Restart Home Assistant

## Configuration

### ESPHome Setup

Your ESP32 needs to be configured with the emonTx component from the FredM67 fork. Add this to your ESPHome configuration:

```yaml
external_components:
  - source: github://pr#9027
    components: [emontx]
    refresh: 0s

uart:
  id: emontx_uart
  rx_pin: GPIO20
  tx_pin: GPIO21
  baud_rate: 115200

# Required: API for Home Assistant communication
api:
  encryption:
    key: !secret api_encryption_key
  # Required for auto-registered send_command service
  custom_services: true

emontx:
  # Enable config panel - automatically registers send_command service
  # and fires esphome.emontx_raw events for all serial data
  config_panel: true
```

> **Note**: When `config_panel: true` is set, the `send_command` service is automatically registered. The `custom_services: true` option is required to enable this feature. Commands sent via this service automatically have CR+LF line endings appended as required by the emonTx firmware.

### Home Assistant Setup

1. Go to Settings > Devices & Services
2. Click "Add Integration"
3. Search for "emonPi/Tx Configuration"
4. Select your ESPHome device from the dropdown
5. Click "Submit"

## Usage

After installation, a new panel called "emonPi/Tx Config" will appear in the Home Assistant sidebar.

### Device Config Tab

The main configuration interface with:

- **CT Channels**: Configure calibration (CT Type), phase lead for each current channel
- **Voltage Channels**: Enable/disable and calibrate voltage inputs (for 3-phase systems)
- **Radio Settings**: Configure RF module (node ID, group, band, format)
- **Other Settings**: Pulse input, data logging interval, JSON output format

**Buttons:**
- **Load Config**: Read current configuration from the emonPi/Tx (sends `l` command)
- **Save**: Save configuration to EEPROM (sends `s` command)
- **Zero Energy Values**: Reset all energy counters (with 20-second confirmation countdown)

### Serial Terminal Tab

A full serial terminal for direct communication:

- **Terminal Output**: Shows all received data from the emonPi/Tx
- **Command Input**: Type commands to send to the emonPi/Tx
- **Quick Commands**: Buttons for common commands (l, v, s, d)

### Live Data Tab

Real-time display of all sensor values received from the emonPi/Tx, including:
- Voltage readings (V1-V3, depending on single/three phase)
- Power readings (P1-P12, depending on device)
- Energy totals (E1-E12, depending on device)
- Other sensors: temperature, pulse, message counter (MSG)

## Common emonPi/Tx Commands

| Command | Description |
|---------|-------------|
| `l` | List all configuration parameters |
| `v` | Show firmware version |
| `s` | Save configuration to EEPROM |
| `d` | Reset to default values |
| `z` | Zero energy counters (requires `y` confirmation) |
| `k<n> <ical> <ilead>` | Set CT channel calibration |

Refer to the [emonTx documentation](https://docs.openenergymonitor.org/) for a complete list of commands.

## Troubleshooting

### No device found

- Ensure the ESPHome device is online and connected to Home Assistant
- Verify the API encryption key matches in ESPHome and Home Assistant
- Check that `config_panel: true` is set in your emontx configuration (this registers the required service)

### No data received

- Check the UART connections between ESP32 and emonTx
- Verify the baud rate is correct (115200 by default)
- **Important**: Make sure you have `config_panel: true` set in your ESPHome emontx configuration
- Look at the ESPHome logs for any errors

### Config not loading / Commands not working

- Verify the TX pin is connected and configured in ESPHome
- Check that `custom_services: true` is set in your `api:` configuration
- Monitor the serial output with an FTDI adapter to verify commands are being sent

### Phase values showing incorrect numbers

- Make sure your ESPHome component is up to date (clean build and reinstall)
- Hard refresh the browser (Ctrl+Shift+R) to clear cached panel files

## Support

- [GitHub Issues](https://github.com/FredM67/ha-emon-config/issues)
- [OpenEnergyMonitor Community](https://community.openenergymonitor.org/)

## License

GPL-3.0 License - See LICENSE file for details.

## Credits

- [OpenEnergyMonitor](https://openenergymonitor.org/) for the emonTx hardware and firmware
- [ESPHome](https://esphome.io/) for the amazing IoT framework
