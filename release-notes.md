## What's new in v1.8.0-beta.5

### Feature: support the verbose serial output (`c2`) of firmware 1.1.2

- Display current (`I`), power factor (`PF`) and apparent power (`AP`) as their own groups with proper labels and units
- Show disabled channels for these groups as well, highlighted like the existing power and energy channels
- Apply the configured friendly channel names to the new groups
- Accept the lowercase temperature keys (`t1`–`t8`) used by the verbose output
- Added translations for English, French, German, Spanish, and Italian

## What's new in v1.8.0-beta.4

### Fix: parse complete automatic calibration results

- Parse the complete calibration result block after `Finished calibration`
- Support both current (`IRMS`) and voltage (`VRMS`) result values
- Display measured, actual, and new calibration values with labels and units

## What's new in v1.8.0-beta.3

### Fix: avoid duplicate friendly channel names

- Show the channel identifier and friendly name in separate columns during automatic calibration
- Prevent friendly names from being displayed twice

## What's new in v1.8.0-beta.2

### Fix: show friendly channel names during automatic calibration

- Show the configured friendly name for each selected CT or voltage channel
- Leave the name column empty when no friendly name has been configured
- Hide the internal firmware input number from the channel selection list

## What's new in v1.8.0-beta.1

### Feature: automatic voltage and CT calibration

- Calibrate individual or multiple voltage phases and CT channels from the configuration panel
- Enter a reference voltage from an official meter or MID device, or a known load current
- Show calibration progress and firmware results for each selected channel
- Reload the device configuration after calibration because the firmware saves the new value automatically
- Added translations for English, French, German, Spanish, and Italian

## What's new in v1.7.3

### Fix: correct integrationVersion displayed in panel

`panel.html` was still reporting version `1.7.1` after the v1.7.2 release.

## What's new in v1.7.2

### Fix: allow OTA flash when bootloader status is unknown

Older emonTx6/emonPi3 firmware does not report the bootloader type (no `l` or `v` command output). Previously this caused the Flash Firmware button to be permanently disabled with a misleading warning.

- Unknown bootloader now shows a neutral grey notice explaining the situation
- The Flash Firmware button is enabled — the flash will fail safely if the UART bootloader is not installed, without touching the device
- The amber warning and disabled button are kept only when the bootloader is **positively identified** as non-UART

## What's new in v1.7.1

### Fix: clear error when emontx_updater is not configured

When the `emontx_updater` ESPHome component is not loaded on the device, the flash service is absent and HA would throw an obscure "action not found" error on click.

- A yellow warning notice is now shown in the Firmware Update tab when the service is not detected, explaining what is missing and how to fix it
- The Flash Firmware button is disabled until the service becomes available
