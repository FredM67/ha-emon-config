# CLAUDE.md

This file provides guidance to AI models when working with code in this repository.

## Running Tests

```bash
pip install -r requirements_test.txt
pytest
```

Tests use `pytest-homeassistant-custom-component` and are fully async (`asyncio_mode = auto`).

## Development Workflow

No build step — the frontend is vanilla Vue.js 2.x loaded from CDN. To iterate:

1. Copy `custom_components/emontx_config/` to your HA `config/custom_components/`
2. Restart Home Assistant once (panel registration)
3. Edit files, then hard-refresh browser (Ctrl+Shift+R) — no restart needed for frontend changes

Frontend files are served with `cache_headers=False`.

## Version Bumping

**Three places must be updated together on every release:**

1. `custom_components/emontx_config/manifest.json` → `"version"`
2. `custom_components/emontx_config/frontend/panel.html` → `integrationVersion: '...'` (line ~257)
3. `release-notes.md` → new section at the top

Then tag and release:
```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z" --notes "..."
```

## Architecture

### Backend (`custom_components/emontx_config/`)

- **`__init__.py`**: Registers the iframe panel, serves static files at `/emontx_config_static/`, registers the `emontx_config.send_command` service, listens for `esphome.emontx_raw` events, and exposes two WebSocket commands (`emontx_config/get_channel_names`, `emontx_config/save_channel_names`).
- **`config_flow.py`**: Setup wizard — discovers ESPHome devices that expose a `_send_command` service, lets the user pick one.
- **`const.py`**: `DOMAIN`, `EVENT_EMONTX_RAW`, `CONF_ESPHOME_DEVICE`.

Channel names are persisted in the config entry's `options` dict, keyed by device name.

### Frontend (`frontend/`)

Single-page Vue.js 2.x app loaded in an iframe. Entry point is `panel.html` which loads all components and mixins, then instantiates the root Vue instance.

**Mixins** hold the shared logic:
- `connection.js` — WebSocket to HA, event subscription, device online/offline detection
- `data-parser.js` — parses raw serial lines (`l` config dump, `v` version, live CSV data, `k+`/`k?` acks)
- `config-commands.js` — sends configuration commands to the device via `esphome.<device>_send_command`
- `firmware-update.js` — fetches GitHub releases, manages the OTA flash flow (calls `emontx_updater.flash_firmware` HA service)
- `yaml-generator.js` — generates ESPHome YAML from current device state
- `channel-names.js` — loads/saves channel names via the custom WebSocket commands

**Components** are the tab UIs: `config-tab.js`, `live-data-tab.js`, `accumulators-tab.js`, `firmware-tab.js`, `terminal-tab.js`, `modals.js`.

**i18n**: `frontend/i18n/*.json` (en, fr, de, es, it) — UI strings. `translations/*.json` is for the HA config flow only. When adding a new i18n key, add it to **all five** language files; untranslated languages can copy the English string.

### Communication chain

```
Frontend (Vue) → HA WebSocket → ESPHome service → emontx_ha_bridge → UART → emonPi/Tx
emonPi/Tx → UART → emontx_ha_bridge → esphome.emontx_raw event → Frontend
```

The `emontx_ha_bridge` ESPHome component (external, from the `emontx-ha-bridge` branch of `FredM67/esphome_fork`) bridges serial data to HA events and registers the `send_command` service. It requires `homeassistant_services: true` and `custom_services: true` in the ESPHome `api:` config.

### OTA firmware flash

`firmware-tab.js` / `mixins/firmware-update.js` call the `emontx_updater.flash_firmware` HA service (provided by the `emontx_updater` ESPHome component). The bootloader field on `device` can be:
- `'uart'` — confirmed, flash allowed
- `''` (empty) — unknown (old firmware), flash allowed with a grey notice
- anything else — non-UART bootloader, flash blocked with amber warning
