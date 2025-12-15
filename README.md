# emonTx Configuration for Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)

A Home Assistant integration that provides a web-based configuration interface for OpenEnergyMonitor emonTx devices connected via an ESP32 serial bridge running ESPHome.

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

Your ESP32 needs to be configured with the emonTx component from the FredM67 fork. Add this to your ESPHome configuration:

```yaml
external_components:
  - source:
      type: git
      url: https://github.com/FredM67/esphome
      ref: emontx-web-config
    components: [emontx]
    refresh: 0s

uart:
  id: emontx_uart
  rx_pin: GPIO20
  tx_pin: GPIO21
  baud_rate: 115200

emontx:
  # on_line trigger captures ALL serial lines (JSON + plain text config responses)
  on_line:
    - then:
        - homeassistant.event:
            event: esphome.emontx_line
            data:
              device_id: !lambda "return App.get_name();"
              line: !lambda "return line;"

  # on_json trigger for sensor data (optional, for backward compatibility)
  on_json:
    - then:
        - homeassistant.event:
            event: esphome.emontx_data
            data:
              device_id: !lambda "return App.get_name();"
              data: !lambda "return raw_json;"

# Optional: Define sensors for individual values
sensor:
  - platform: emontx
    tag_name: "V1"
    name: "Voltage L1"
  - platform: emontx
    tag_name: "P1"
    name: "Power 1"
  # ... add more sensors as needed

# Required: API for Home Assistant communication
api:
  encryption:
    key: !secret api_encryption_key
  services:
    - service: send_command
      variables:
        command: string
      then:
        - uart.write: !lambda |-
            std::string cmd = command + "\r\n";
            return std::vector<uint8_t>(cmd.begin(), cmd.end());
```

### Home Assistant Setup

1. Go to Settings > Devices & Services
2. Click "Add Integration"
3. Search for "emonTx Configuration"
4. Select your ESPHome device from the dropdown
5. Click "Submit"

## Usage

After installation, a new panel called "emonTx Config" will appear in the Home Assistant sidebar.

### Device Config Tab

The main configuration interface with:

- **CT Channels**: Configure calibration (CT Type), phase lead for each current channel
- **Voltage Channels**: Enable/disable and calibrate voltage inputs (for 3-phase systems)
- **Radio Settings**: Configure RF module (node ID, group, band, format)
- **Other Settings**: Pulse input, data logging interval, JSON output format

**Buttons:**
- **Load Config**: Read current configuration from the emonTx (sends `l` command)
- **Save**: Save configuration to EEPROM (sends `s` command)
- **Zero Energy Values**: Reset all energy counters (with 20-second confirmation countdown)

### Serial Terminal Tab

A full serial terminal for direct communication:

- **Terminal Output**: Shows all received data from the emonTx
- **Command Input**: Type commands to send to the emonTx
- **Quick Commands**: Buttons for common commands (l, v, s, d)

### Live Data Tab

Real-time display of all sensor values received from the emonTx, including:
- Voltage readings (V1, V2, V3)
- Power readings (P1-P6)
- Energy totals (E1-E6)
- Message counter (MSG)

## Common emonTx Commands

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
- Check that the `send_command` service is exposed in your ESPHome configuration
- Verify the API encryption key matches in ESPHome and Home Assistant

### No data received / Config not loading

- Check the UART connections between ESP32 and emonTx
- Verify the baud rate is correct (115200 by default)
- **Important**: Make sure you have the `on_line` trigger configured in ESPHome (not just `on_json`)
- Look at the ESPHome logs for any errors

### Commands not working

- Verify the TX pin is connected and configured in ESPHome
- Check that the `send_command` service includes `\r\n` line ending
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
