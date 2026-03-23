# emonPi/Tx Configuration for Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=FredM67&repository=ha-emon-config&category=integration)
[![GitHub Release](https://img.shields.io/github/v/release/FredM67/ha-emon-config)](https://github.com/FredM67/ha-emon-config/releases)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2023.1+-blue)](https://www.home-assistant.io/)
[![OpenEnergyMonitor](https://img.shields.io/badge/OpenEnergyMonitor-emonPi%2FTx-green)](https://openenergymonitor.org/)
[![Maintenance](https://img.shields.io/maintenance/yes/2026)](https://github.com/FredM67/ha-emon-config)
[![Sponsor](https://img.shields.io/badge/Sponsor-PayPal-blue?logo=paypal)](https://www.paypal.com/donate/?business=CHGDDS5VQUJFN&no_recurring=0&item_name=Support+emonPi%2FTx+Configuration+for+Home+Assistant&currency_code=EUR)

[![Validate HACS](https://github.com/FredM67/ha-emon-config/actions/workflows/validate-hacs.yml/badge.svg)](https://github.com/FredM67/ha-emon-config/actions/workflows/validate-hacs.yml)
[![Validate hassfest](https://github.com/FredM67/ha-emon-config/actions/workflows/validate-hassfest.yml/badge.svg)](https://github.com/FredM67/ha-emon-config/actions/workflows/validate-hassfest.yml)
[![Stars](https://img.shields.io/github/stars/FredM67/ha-emon-config)](https://github.com/FredM67/ha-emon-config/stargazers)
[![Last Commit](https://img.shields.io/github/last-commit/FredM67/ha-emon-config)](https://github.com/FredM67/ha-emon-config/commits)
[![Open Issues](https://img.shields.io/github/issues/FredM67/ha-emon-config)](https://github.com/FredM67/ha-emon-config/issues)

A Home Assistant integration that provides a web-based configuration interface for OpenEnergyMonitor emonPi/Tx devices connected via an ESP32 serial bridge running ESPHome.

## Features

- **Device Configuration**: Full configuration interface for CT calibration, voltage calibration, radio settings, and more
- **Friendly Channel Names**: Add custom names to CT, Voltage, OPA, and Temperature channels for easier identification
  - Names are stored per-device in Home Assistant
  - Export/Import names as JSON for backup or migration
- **Multi-device Support**: Switch between multiple emonPi/Tx devices from a dropdown selector
- **Batch Configuration**: Edit multiple settings and apply them all at once with the floating Apply/Discard bar
- **Serial Terminal**: Send commands and receive responses from your emonTx device
  - Autoscroll toggle, copy to clipboard, download log, clear terminal
  - Resizable terminal window
  - Quick command buttons for common operations
- **Live Data Display**: View real-time power and energy readings from all channels
  - Data grouped by type (Voltage, Power, Energy, Temperature, Pulse)
  - Inactive channels shown with strikethrough indicator
- **Accumulators Tab**: View and reset individual energy and pulse counters
- **Zero Energy**: Reset energy counters with confirmation countdown (matching firmware behavior)
- **Unsaved Changes Warning**: Banner alerts you when device has unsaved changes
- **YAML Generator**: Generate ESPHome sensor configuration for active channels
  - Uses friendly names when configured
  - Supports OPA pulse channels and temperature sensors
- **Multi-phase Support**: Full support for emonPi3 with 3-phase voltage monitoring
- **Firmware Update Notification**: Checks for firmware updates from GitHub
  - Configurable check frequency (Never, Daily, Weekly, Monthly)
  - Settings stored on the HA side (shared across all browsers)
  - Blinking badge when update is available
- **No-response Detection**: Shows a warning if the device doesn't respond within 10 seconds, with guidance for emonTx4/5 users (serial jumper must be removed)
- **RF Power Warning**: Safety warning when setting RF power to high levels (7 dBm+)
- **Multi-language**: Supports English, French, German, Italian, and Spanish

## Requirements

- Home Assistant 2023.1.0 or newer
- **ESPHome Integration** installed in Home Assistant (Settings > Devices & Services > Add Integration > ESPHome)
- An **emonWifi** (ESP32-C3 Mini) added to the ESPHome integration and showing as "Online"
- ESPHome firmware on the emonWifi with the [emonTx component](https://github.com/esphome/esphome/pull/9027) configured
- An emonTx/emonPi device connected to the emonWifi via UART

> **Note**: If using a different ESP32 board, some settings (board type, GPIO pins) may need to be adjusted.

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

Your ESP32 needs to be configured with the emonTx component from [PR #9027](https://github.com/esphome/esphome/pull/9027).

#### New to ESPHome? Start Here

If you haven't used ESPHome before, follow these steps:

1. **Install the ESPHome Add-on** (if using Home Assistant OS):
   - Go to Settings > Add-ons > Add-on Store
   - Search for "ESPHome" and install it
   - Start the add-on and click "Open Web UI"

2. **Create a New Device**:
   - In the ESPHome dashboard, click "+ New Device"
   - Click "Continue" on the welcome screen
   - Enter a name for your device (e.g., `emonwifi`)
   - Select "ESP32-C3" as the device type
   - Click "Skip" when asked to install (we'll edit the config first)

3. **Edit the Configuration**:
   - Click "Edit" on your newly created device
   - Replace or modify the generated YAML with the configuration below
   - Adjust the GPIO pins for your specific board
   - Click "Save" then "Install"

4. **Install the Firmware**:
   - For first-time installation, use "Plug into this computer" or "Manual download"
   - For subsequent updates, use "Wirelessly" (OTA)

5. **Add to Home Assistant**:
   - Go to Settings > Devices & Services
   - ESPHome devices are usually auto-discovered
   - If not, click "Add Integration" > "ESPHome" and enter the device IP

#### Complete Example Configuration

Here's a complete ESPHome configuration file for the emonWifi:

```yaml
esphome:
  name: emonwifi
  friendly_name: emonWifi

esp32:
  board: esp32-c3-devkitm-1
  framework:
    type: esp-idf

# Enable logging
logger:

# Enable Home Assistant API with encryption
api:
  encryption:
    key: "your-32-byte-base64-key-here"  # See note below
  # Required for the send_command service
  custom_services: true
  actions:
    - action: send_command
      variables:
        command: string
      then:
        - emontx.send_command:
            command: !lambda 'return command;'

# Enable Over-The-Air updates
ota:
  platform: esphome

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

# External component for emonTx support
external_components:
  - source: github://pr#9027
    components: [emontx]
    refresh: 0s

# UART connection to emonTx/emonPi
uart:
  id: emontx_uart
  rx_pin: GPIO20  # Adjust for your board
  tx_pin: GPIO21  # Adjust for your board
  baud_rate: 115200

# emonTx component
emontx:
  # Enable config panel - fires esphome.emontx_raw and
  # esphome.emontx_json events for serial data
  config_panel: true
```

#### API Encryption Key

The `api.encryption.key` is required for secure communication between ESPHome and Home Assistant. You have two options:

1. **Generate a new key**: When you create a new ESPHome device through the Home Assistant ESPHome add-on, it automatically generates an encryption key for you. You can find it in your device's YAML configuration.

2. **Use secrets**: Store the key in your `secrets.yaml` file and reference it with `!secret api_encryption_key`:
   ```yaml
   api:
     encryption:
       key: !secret api_encryption_key
   ```

To generate a new key manually, you can use: `openssl rand -base64 32`

#### Minimal Addition to Existing Config

If you already have an ESPHome device configured, you only need to add these sections:

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

# Add custom_services and send_command action to your existing api: section
api:
  # ... your existing config ...
  custom_services: true
  actions:
    - action: send_command
      variables:
        command: string
      then:
        - emontx.send_command:
            command: !lambda 'return command;'

emontx:
  config_panel: true
```

> **Note**: The `send_command` service is defined in the `api: actions:` section using the standard ESPHome pattern. The `custom_services: true` option is required to enable this feature. The `config_panel: true` option enables automatic firing of `esphome.emontx_raw` and `esphome.emontx_json` events. Commands sent via this service automatically have LF line endings appended as required by the emonTx firmware.

### Home Assistant Setup

**Prerequisites:** Ensure the ESPHome integration is installed and your ESP32 device is added and showing as "Online" in Settings > Devices & Services > ESPHome.

1. Go to Settings > Devices & Services
2. Click "Add Integration"
3. Search for "emonPi/Tx Configuration"
4. Select your ESPHome device from the dropdown (only devices with `config_panel: true` will appear)
5. Click "Submit"

## Usage

After installation, a new panel called "emonPi/Tx Config" will appear in the Home Assistant sidebar.

### Device Config Tab

The main configuration interface with three sub-tabs:

#### Energy Sensors
- **CT Channels**: Configure calibration (CT Type), phase lead, and friendly name for each current channel
- **Voltage Channels**: Enable/disable, calibrate, and name voltage inputs (for 3-phase systems)
- **Bulk Configuration**: Apply the same CT type and settings to multiple channels at once

#### Other Sensors
- **OPA Channels**: Configure OneWire or Pulse input modes with optional pull-up and debounce period
- **Temperature Sensors**: DS18B20 sensor management with 8-slot grid layout
  - Scan for connected sensors on the OneWire bus
  - Drag-and-drop sensors between slots to reassign
  - Dropdown selector for slot reassignment
  - Status indicators: matched (✓), pending (⏳), modified (✎), new (★), missing (⚠)
  - Selectable/copyable sensor addresses
  - Clear individual slots or all slots at once
  - Restore saved sensor mappings from device memory
  - Save mappings to device memory (with warning if pending changes exist)
  - Slot changes use the "Apply/Discard" workflow
  - Reliable list parsing using firmware `[end]` markers
- **Channel Names Backup**: Export/Import friendly names as JSON for backup or migration

#### Other Settings
- **Radio Settings**: Configure RF module (node ID, group, band, power, format)
  - Warning displayed when setting RF power to high levels (7 dBm+)
- **Datalog Interval**: Set the reporting interval
- **JSON Output**: Enable/disable JSON serial format
- **Firmware Update Check**: Configure automatic update checking frequency and manually check for updates

**Buttons:**
- **Apply**: Send pending configuration changes to the device
- **Discard**: Revert to the last applied configuration
- **Save to Flash**: Save configuration to EEPROM (sends `s` command)
- **Zero Energy**: Reset all energy counters
- **Reset Defaults**: Restore factory settings
- **Reload Config**: Read current configuration from the device
- **Generate YAML**: Generate ESPHome sensor configuration using friendly names

**Pending Changes Bar:**
When you modify settings, a floating bar appears at the bottom showing the number of pending changes. Click "Apply" to send them to the device or "Discard" to revert.

**Other features:**
- **Device selector**: Switch between multiple emonPi/Tx devices (dropdown in status bar)
- **Unsaved changes warning**: Banner appears when configuration changes haven't been saved to flash

### Serial Terminal Tab

A full serial terminal for direct communication:

- **Terminal Output**: Shows all received data from the emonPi/Tx (resizable window)
- **Command Input**: Type commands to send to the emonPi/Tx
- **Quick Commands**: Buttons for common commands (l, v, s, ?)
- **Toolbar**: Autoscroll toggle, copy to clipboard, download log, clear terminal

### Live Data Tab

Real-time display of all sensor values received from the emonPi/Tx, grouped by type:
- **Voltage** (V1-V3, depending on single/three phase)
- **Power** (P1-P12, depending on device)
- **Energy** (E1-E12, depending on device)
- **Other sensors**: temperature, pulse, message counter (MSG)

Inactive channels are displayed with a strikethrough indicator.

### Accumulators Tab

View and manage energy and pulse accumulators stored on the device:
- **Energy Accumulators**: View current Wh values for each CT channel
- **Pulse Accumulators**: View pulse counts for OPA channels configured as pulse inputs
- **Individual Reset**: Zero individual accumulators with confirmation
- **Zero All**: Reset all accumulators at once

## Documentation

For detailed information about emonTx/emonPi devices, firmware configuration, and hardware specifications:

- **[emonPi/Tx Documentation](https://docs.openenergymonitor.org/)** - Complete hardware and firmware guide
- **[OpenEnergyMonitor Community](https://community.openenergymonitor.org/)** - Community forum for support

## Common emonPi/Tx Commands

| Command | Description |
|---------|-------------|
| `l` | List all configuration parameters |
| `v` | Show firmware version |
| `s` | Save configuration to EEPROM |
| `?` | Show help with available commands |
| `d` | Reset to default values |
| `z` | Zero energy counters (requires `y` confirmation) |
| `k<n> <ical> <ilead>` | Set CT channel calibration |
| `ol` | List found OneWire temperature sensors on bus |
| `on` | List saved temperature sensor addresses in NVM |
| `oh` | Save (hold) current temperature sensor slot mapping to NVM |

Refer to the [emonTx documentation](https://docs.openenergymonitor.org/) for a complete list of commands.

## Troubleshooting

### No device found

- **First**, ensure the ESPHome integration is installed in Home Assistant
- Verify your ESP32 device is added to the ESPHome integration and shows as "Online"
- Check that the API encryption key matches between ESPHome firmware and Home Assistant
- Verify that `config_panel: true` is set in your emontx configuration
- Verify that the `send_command` action is defined in your `api:` section (see configuration examples above)
- The device dropdown only shows ESPHome devices that have the `_send_command` service registered

### No data received

- Check the UART connections between ESP32 and emonTx
- Verify the baud rate is correct (115200 by default)
- **Important**: Make sure you have `config_panel: true` set in your ESPHome emontx configuration
- If you recently renamed your ESPHome device, hard refresh the browser (Ctrl+Shift+R) to reload the frontend
- Check Developer Tools > Events and listen for `esphome.emontx_raw` events to verify data is being received
- Look at the ESPHome logs for any errors

### Config not loading / Commands not working

- Verify the TX pin is connected and configured in ESPHome
- Check that `custom_services: true` is set in your `api:` configuration
- Monitor the serial output with an FTDI adapter to verify commands are being sent
- **emonTx4/5 users**: The serial jumper must be removed (unsoldered or broken) for the emonWifi to communicate with the board. Without this, the device will not respond to commands. A red warning will appear on the Config tab after 10 seconds if no response is received

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
