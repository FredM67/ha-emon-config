# Architecture Documentation

This document describes the technical architecture of the emonPi/Tx Configuration integration for Home Assistant.

## Overview

The integration consists of two main parts:
1. **Backend (Python)**: Home Assistant integration that registers the panel, handles WebSocket communication, and manages configuration storage
2. **Frontend (Vue.js)**: Single-page application displayed in an iframe that provides the user interface

## Communication Flow

```mermaid
flowchart TB
    A[Frontend - Vue.js] <--> B[Home Assistant - WebSocket]
    B <--> C[ESPHome Component]
    C <--> D[emonPi/Tx - Serial]
```

Commands flow down, responses flow back up.

1. User interacts with the Vue.js frontend
2. Frontend sends commands via Home Assistant WebSocket API
3. Home Assistant calls ESPHome services
4. ESPHome component sends commands to emonPi/Tx via UART
5. Responses flow back through the same chain via events

## Project Structure

```
ha-emon-config/
├── custom_components/
│   └── emontx_config/
│       ├── __init__.py          # Integration setup, WebSocket handlers
│       ├── config_flow.py       # Configuration flow for setup wizard
│       ├── const.py             # Constants (domain, event names)
│       ├── manifest.json        # Integration metadata
│       ├── services.yaml        # Service definitions
│       ├── strings.json         # Config flow strings (reference)
│       ├── icon.png             # Integration icon
│       ├── icon@2x.png          # Integration icon (retina)
│       ├── translations/        # Config flow translations
│       │   ├── en.json
│       │   ├── fr.json
│       │   ├── de.json
│       │   ├── it.json
│       │   └── es.json
│       └── frontend/            # Vue.js frontend application
│           ├── panel.html       # Main entry point
│           ├── panel.css        # Global styles
│           ├── oem_proxy.html   # OEM documentation proxy
│           ├── components/      # Vue components
│           │   ├── config-tab.js
│           │   ├── terminal-tab.js
│           │   ├── live-data-tab.js
│           │   ├── accumulators-tab.js
│           │   ├── firmware-tab.js
│           │   ├── temp-sensors-section.js
│           │   └── modals.js
│           ├── mixins/          # Vue mixins (shared logic)
│           │   ├── connection.js
│           │   ├── data-parser.js
│           │   ├── config-commands.js
│           │   ├── yaml-generator.js
│           │   ├── channel-names.js
│           │   └── firmware-update.js
│           └── i18n/            # UI translations
│               ├── en.json
│               ├── fr.json
│               ├── de.json
│               ├── it.json
│               └── es.json
├── hacs.json                    # HACS configuration
├── ARCHITECTURE.md              # This document
└── README.md                    # User documentation
```

## Backend Architecture

### `__init__.py`

The main integration file handles:

- **Panel Registration**: Registers an iframe panel in Home Assistant's sidebar
- **Static File Serving**: Serves frontend files from `/emontx_config_static/`
- **WebSocket Commands**: Two custom WebSocket endpoints for channel names:
  - `emontx_config/get_channel_names`: Retrieve stored channel names
  - `emontx_config/save_channel_names`: Persist channel names to config entry
- **Event Listening**: Listens for `esphome.emontx_raw` events from ESPHome
- **Service Registration**: Registers `emontx_config.send_command` service

### `config_flow.py`

Implements the Home Assistant config flow for initial setup:
- Discovers available ESPHome devices with `_send_command` services
- Allows user to select which device to configure
- Creates the config entry

### `const.py`

Defines constants:
- `DOMAIN`: `"emontx_config"`
- `EVENT_EMONTX_RAW`: `"esphome.emontx_raw"`
- `CONF_ESPHOME_DEVICE`: Configuration key for device name

## Frontend Architecture

The frontend is a Vue.js 2.x application loaded in an iframe. It communicates with Home Assistant via the WebSocket API.

### Entry Point: `panel.html`

- Loads Vue.js from CDN
- Loads all components, mixins, and styles
- Initializes the main Vue instance with:
  - Data properties for device state, UI state, translations
  - Computed properties for derived state
  - Lifecycle hooks for initialization

### Components (`components/`)

| File | Description |
|------|-------------|
| `config-tab.js` | Main configuration interface with sub-tabs for energy sensors, other sensors, and settings |
| `terminal-tab.js` | Serial terminal for direct command input/output |
| `live-data-tab.js` | Real-time display of sensor values |
| `accumulators-tab.js` | Energy and pulse accumulator management |
| `firmware-tab.js` | Firmware update UI (version check, OTA flash) |
| `modals.js` | Modal dialogs (zero confirmation, RF power warning, bulk CT settings, YAML generator) |

### Mixins (`mixins/`)

Mixins extract reusable logic from the main Vue instance:

| File | Description |
|------|-------------|
| `connection.js` | WebSocket connection to Home Assistant, event handling |
| `data-parser.js` | Parsing device responses (config data, live data) |
| `config-commands.js` | Methods for sending configuration commands to device |
| `yaml-generator.js` | ESPHome YAML configuration generation |
| `channel-names.js` | Channel name management (load, save, export, import) |
| `firmware-update.js` | Firmware update checking from GitHub releases |

### Internationalization (`i18n/`)

UI translations in JSON format:
- `en.json` - English (default)
- `fr.json` - French
- `de.json` - German
- `it.json` - Italian
- `es.json` - Spanish

Language is auto-detected from Home Assistant settings.

## Data Flow Details

### Sending Commands to Device

```javascript
// Frontend (Vue.js)
this.hass.callService('esphome', 'devicename_send_command', { command: 'l' });

// ESPHome component adds CR+LF and sends via UART
// emonPi/Tx processes command and responds
```

### Receiving Data from Device

```javascript
// ESPHome fires event with serial data
hass.bus.async_fire('esphome.emontx_raw', { data: '...' });

// Frontend listens via WebSocket subscription
this.hass.subscribeEvents(callback, 'esphome.emontx_raw');

// data-parser.js mixin parses the response
this.parseDeviceData(eventData);
```

### Channel Names Storage

Channel names are stored in the config entry's `options`:

```python
# Backend stores in config entry
entry.options = {
    "channel_names": {
        "device_name": {
            "ct": {"1": "Kitchen", "2": "Living Room"},
            "voltage": {"1": "Main Supply"},
            "opa": {},
            "temp": {"28-abc123": "Outside"}
        }
    }
}
```

## Styling

`panel.css` provides:
- Responsive layout (mobile-friendly)
- Card-based UI components
- Terminal styling (dark theme)
- Tab navigation
- Form elements and buttons
- Modal overlays
- Status indicators
- Floating action bar for pending changes

## Adding New Features

### Adding a New Tab

1. Create component in `components/new-tab.js`
2. Register component in `panel.html`
3. Add tab button and content area
4. Add translations in all `i18n/*.json` files

### Adding a New Configuration Option

1. Add parsing logic in `mixins/data-parser.js`
2. Add UI controls in appropriate component
3. Add command sending in `mixins/config-commands.js`
4. Update translations

### Adding a New Language

1. Copy `i18n/en.json` to `i18n/xx.json`
2. Translate all strings
3. Add language code to detection in `panel.html` (`detectLanguage` method)
4. Copy `translations/en.json` to `translations/xx.json` for config flow

## Dependencies

- **Home Assistant**: 2023.1.0+
- **ESPHome**: With built-in `emontx` component and `emontx_ha_bridge` external component from the [`emontx-ha-bridge`](https://github.com/FredM67/esphome/tree/emontx-ha-bridge) branch
- **Vue.js**: 2.7.14 (loaded from CDN)

## Build & Development

No build step required - the frontend uses vanilla Vue.js loaded from CDN. To develop:

1. Clone the repository
2. Copy `custom_components/emontx_config` to your HA `config/custom_components/`
3. Restart Home Assistant
4. Edit files and hard-refresh browser (Ctrl+Shift+R) to see changes

Frontend files are served with `cache_headers=False` for easier development.

## ESPHome Component Details

The ESPHome side uses two components working together: the standard `emontx` hub (merged into ESPHome mainline) and the `emontx_ha_bridge` companion component (external, from the fork).

### `emontx` (standard ESPHome component)

The built-in `emontx` component acts as a UART hub that reads serial data from the emonPi/Tx device.

```yaml
emontx:
```

It provides `on_data` and `on_json` automation triggers for local use and exposes `emontx.send_command` for sending commands via UART.

### `emontx_ha_bridge` (external component)

The `emontx_ha_bridge` component bridges the `emontx` hub to Home Assistant via the native API.

```yaml
emontx_ha_bridge:
```

When configured, it:

1. **Registers a service**: `esphome.<device_name>_send_command`
   - Accepts a `command` parameter (string)
   - Automatically appends LF to commands (required by emonTx firmware)
   - Delegates to `emontx.send_command` which writes to UART

2. **Fires events**: `esphome.emontx_raw`
   - Triggered for every raw line received from the emonPi/Tx serial port
   - Event data contains the raw serial line

3. **Fires events**: `esphome.emontx_json`
   - Triggered for every successfully parsed JSON frame
   - Event data contains the JSON string

Both `homeassistant_services: true` and `custom_services: true` must be set in the `api:` section.

### Event Data Format

```javascript
// esphome.emontx_raw — fired for every raw serial line
{
  "device_id": "emonwifi",   // ESPHome device name
  "line": "V1=240.5,P1=1500,P2=200,E1=12345,E2=6789,T1=21.5,MSG=42"
}

// esphome.emontx_json — fired for every parsed JSON frame
{
  "device_id": "emonwifi",
  "data": "{\"V1\":240.5,\"P1\":1500,...}"
}
```

The frontend parses different response types from `emontx_raw` events:
- **Live data**: Comma-separated values (V, P, E, T, pulse, MSG)
- **Config response**: Multi-line output from `l` command
- **Version info**: Response from `v` command
- **Acknowledgments**: `k+` (success) or `k?` (failure) after config commands

## State Management

The Vue.js frontend manages device state through several key data structures.

### Device State

```javascript
device: {
  // Device info
  firmware: '',
  hardware: '',        // 'emonTx5', 'emonPi3', etc.
  firmware_version: '',

  // Voltage channels (up to 3 for 3-phase)
  vchannels: [
    { vcal: 100, vphase: 0, active: true, voltage: '' }
  ],

  // Current channels (up to 12)
  ichannels: [
    { ical: 100, ilead: 0, vchan1: 1, vchan2: 1, active: true }
  ],

  // OPA channels (OneWire/Pulse)
  opa: [
    { active: true, func: 'o', pullUp: true, period: 100 }
  ],

  // Temperature sensors
  tempSensors: [
    { addr: '28-abc123', temp: 21.5 }
  ],

  // Radio settings
  RF: false,
  rfNode: '',
  rfGroup: '',
  // ... more settings
}
```

### Pending Changes Detection

The integration tracks changes by comparing current state to original:

```javascript
// Stored when config is first received
originalDevice: { /* deep copy of device */ }

// Computed property detects differences
hasPendingChanges() {
  return this.pendingChangesList.length > 0;
}

pendingChangesList() {
  // Compares device vs originalDevice
  // Returns array of { type: 'ichannel', index: 0 }, etc.
}
```

### Channel Names

Channel names are stored per-device in Home Assistant's config entry:

```javascript
// In-memory structure
channelNames: {
  ct: { "1": "Kitchen", "2": "Living Room" },
  voltage: { "1": "Main Supply" },
  opa: { "1": "Gas Meter" },
  temp: { "28-abc123": "Outside" }
}

// Persisted via WebSocket
allChannelNames: {
  "emontx6": { ct: {}, voltage: {}, opa: {}, temp: {} },
  "emontx_garage": { ct: {}, voltage: {}, opa: {}, temp: {} }
}
```

## Troubleshooting for Developers

### Browser Console

Open browser developer tools (F12) to see:
- WebSocket messages to/from Home Assistant
- JavaScript errors
- Console logs from the frontend

### Home Assistant Logs

Enable debug logging for the integration:

```yaml
# configuration.yaml
logger:
  default: info
  logs:
    custom_components.emontx_config: debug
```

View logs in Settings → System → Logs, or via:
```bash
tail -f config/home-assistant.log | grep emontx
```

### ESPHome Logs

Monitor ESPHome device logs to see:
- Commands received from Home Assistant
- Serial data from emonPi/Tx
- Events being fired

```bash
esphome logs <device>.yaml
```

### Common Issues

| Issue | Solution |
|-------|----------|
| UI changes not appearing | Hard refresh browser (Ctrl+Shift+R) |
| WebSocket not connecting | Check Home Assistant is running, check browser console for errors |
| Commands not reaching device | Check ESPHome logs, verify `emontx_ha_bridge` is configured |
| Events not received | Verify `homeassistant_services: true` and `custom_services: true` in ESPHome `api:` config |
| Panel not showing in sidebar | Restart Home Assistant after installation |

### Debugging Tips

1. **Test commands manually**: Use Home Assistant Developer Tools → Services to call `esphome.<device>_send_command` directly

2. **Monitor events**: Use Developer Tools → Events, listen to `esphome.emontx_raw`

3. **Check service registration**: Developer Tools → Services, search for your device name

4. **Vue DevTools**: Install Vue.js DevTools browser extension to inspect component state
