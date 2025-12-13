# emonTx Configuration for Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)

A Home Assistant integration that provides a web-based configuration interface for OpenEnergyMonitor emonTx devices connected via an ESP32 serial bridge running ESPHome.

## Features

- **Serial Terminal**: Send commands and receive data from your emonTx device
- **Real-time Data Display**: View live readings from your emonTx
- **OEM Interface**: Access the official OpenEnergyMonitor serial configuration interface
- **Quick Commands**: One-click buttons for common emonTx commands

## Requirements

- Home Assistant 2023.1.0 or newer
- An ESP32 running ESPHome with the emonTx component configured
- An emonTx device connected to the ESP32 via UART

## Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Click on "Integrations"
3. Click the three dots menu in the top right corner
4. Select "Custom repositories"
5. Add this repository URL: `https://github.com/FredM67/ha-emon-config`
6. Select "Integration" as the category
7. Click "Add"
8. Search for "emonTx Configuration" and install it
9. Restart Home Assistant

### Manual Installation

1. Download this repository
2. Copy the `custom_components/emontx_config` folder to your Home Assistant `config/custom_components/` directory
3. Restart Home Assistant

## Configuration

### ESPHome Setup

First, ensure your ESP32 is configured with the emonTx component and exposes the `send_command` service. Example ESPHome configuration:

```yaml
esphome:
  name: emontx-config
  friendly_name: emonTx Configuration

esp32:
  board: esp32dev

api:
  encryption:
    key: !secret api_encryption_key
  services:
    - service: send_command
      variables:
        command: string
      then:
        - emontx.send_command:
            id: emontx_device
            command: !lambda 'return command;'

uart:
  tx_pin: GPIO17
  rx_pin: GPIO16
  baud_rate: 115200
  id: uart_emontx

emontx:
  id: emontx_device
  uart_id: uart_emontx
  on_json:
    then:
      - homeassistant.event:
          event: esphome.emontx_data
          data:
            payload: !lambda 'return raw_json;'
```

### Home Assistant Setup

1. Go to Settings > Devices & Services
2. Click "Add Integration"
3. Search for "emonTx Configuration"
4. Select your ESPHome device from the dropdown
5. Click "Submit"

## Usage

After installation, a new panel called "emonTx Config" will appear in the Home Assistant sidebar.

### Serial Terminal Tab

- **Terminal**: Shows all received data from the emonTx
- **Command Input**: Type commands to send to the emonTx
- **Quick Commands**: Click buttons to send common commands:
  - `l` - List current configuration
  - `v` - Show firmware version
  - `s` - Save configuration
  - `d` - Reset to defaults

### OEM Interface Tab

This tab attempts to load the official OpenEnergyMonitor serial configuration interface. Due to browser security restrictions (CORS), this may not work in all cases. Use the Serial Terminal tab as an alternative.

### Configuration Tab

Shows the connection status and device information.

## Common emonTx Commands

| Command | Description |
|---------|-------------|
| `l` | List all configuration parameters |
| `v` | Show firmware version |
| `s` | Save configuration to EEPROM |
| `d` | Reset to default values |
| `k<n> <value>` | Set configuration parameter (e.g., `k1 100.0`) |

Refer to the [emonTx documentation](https://docs.openenergymonitor.org/) for a complete list of commands.

## Troubleshooting

### No device found

- Ensure the ESPHome device is online and connected to Home Assistant
- Check that the `send_command` service is exposed in your ESPHome configuration
- Verify the API encryption key matches in ESPHome and Home Assistant

### No data received

- Check the UART connections between ESP32 and emonTx
- Verify the baud rate is correct (115200 by default)
- Look at the ESPHome logs for any errors

### OEM Interface not loading

This is expected due to browser CORS restrictions. Use the Serial Terminal tab instead, which provides full functionality for configuring your emonTx.

## Support

- [GitHub Issues](https://github.com/FredM67/ha-emon-config/issues)
- [OpenEnergyMonitor Community](https://community.openenergymonitor.org/)

## License

GPL-3.0 License - See LICENSE file for details.

## Credits

- [OpenEnergyMonitor](https://openenergymonitor.org/) for the emonTx hardware and firmware
- [ESPHome](https://esphome.io/) for the amazing IoT framework
