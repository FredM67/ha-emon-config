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
