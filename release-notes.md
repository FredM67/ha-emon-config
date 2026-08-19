## What's new in v1.8.0-beta.20

### UI: hide inactive channels in Accumulators tab

- Energy rows for inactive/disabled CT channels are now hidden entirely (same behaviour as Live Data)
- The Status column has been removed — it is no longer needed since inactive rows are not shown
- The entire Pulse card is hidden when no pulse data is present in the live stream
- Pulse rows are filtered to only show channels that appear in live data

## What's new in v1.8.0-beta.19

### UI: Accumulators tab polish

- Renamed the tab from "Zero Accumulators" to "Accumulators" (all languages) — it now manages both reset and set operations
- Updated the explanation banner to reflect both reset and set capabilities
- Zero and Set buttons no longer repeat the channel number — the row already shows it, so all buttons are now the same width

## What's new in v1.8.0-beta.18

### Feature: set accumulator to a specific value

- New **Set** button next to each Zero button in the Accumulators tab
- Clicking Set opens a dialog to enter a value (in Wh for energy, counts for pulse)
- Sends `ye<n> <m>` (energy) or `yp<n> <m>` (pulse) to the firmware, then reloads accumulators
- Available for emonPi3 only, alongside the existing individual Zero buttons
- Added translations for English, French, German, Spanish, and Italian

## What's new in v1.8.0-beta.17

### UI: center-align measurement headers in channel view

- Measurement column headers are now centered while values remain right-aligned

## What's new in v1.8.0-beta.16

### UI: right-align measurement values in channel view

- Measurement columns (headers and values) in the per-channel table are now right-aligned for easier reading

## What's new in v1.8.0-beta.15

### UI: channel view table fits content

- The per-channel table in Live Data now sizes columns to their content instead of stretching across the full window width

## What's new in v1.8.0-beta.14

### Feature: frequency field in Live Data

- New frequency field (tag `F`) displayed on the device-wide line alongside Message and Voltage
- Formatted as `xx.xx Hz` with translated group labels in all five languages

### Change: hide disabled channels in Live Data

- Inactive/disabled channels are now completely hidden instead of appearing with a red background

### UI: view-mode toggle spacing

- The "By measurement" / "By channel" toggle buttons now have a small gap between them instead of being glued together

## What's new in v1.8.0-beta.13

### Fix: consistent row height with and without field-changed highlight

- All form rows now have the same vertical padding whether highlighted or not — no layout shift when a field is changed

## What's new in v1.8.0-beta.12

### Fix: field-changed highlight collapses row spacing

- The yellow background on a modified field no longer removes the gap between rows — only the left/right margins are negated to bleed the background, not the vertical ones

## What's new in v1.8.0-beta.11

### Fix: serial output toggle layout and translation corrections

- The description line now appears correctly below the segmented control instead of beside it
- French, Italian and Spanish labels use the correct feminine forms to agree with the noun (*Sortie*, *Uscita*, *Salida*)

## What's new in v1.8.0-beta.10

### Feature: serial output verbosity toggle (c0 / c1 / c2)

- New segmented control in *Other Settings* to switch the serial output between Off, Normal, and Verbose mode
- Verbose mode (`c2`) enables current, power factor, and apparent power readings in the Live Data view
- When Off is selected, the Datalog Interval and JSON Serial Format fields are disabled — they have no effect without serial output
- The current mode is read from the device configuration dump and pre-selected automatically
- Added translations for English, French, German, Spanish, and Italian

## What's new in v1.8.0-beta.9

### Fix: restore the friendly names on the voltage readings

- The voltage channels show their configured name again, in both Live Data views
- Disabled voltage channels are highlighted again

## What's new in v1.8.0-beta.8

### Improvement: consistent global readings in both Live Data views

- The message counter and the voltages are now shown the same way in both views: on a single line at the top, above the view-specific content
- Both keep their group heading

## What's new in v1.8.0-beta.7

### Improvement: global readings on top of the per-channel view

- The message counter and the voltages are now shown above the channel table, on a single line
- Temperatures and pulse counts keep the grouped layout below the table

## What's new in v1.8.0-beta.6

### Feature: switch the Live Data layout between measurement and channel views

- New toggle in the Live Data tab header to group readings either by type of measurement or by channel
- The per-channel view shows one row per CT channel with all its measurements (power, energy, current, power factor, apparent power) side by side
- Non-channel readings (message counter, voltages, temperatures, pulse) keep the grouped layout below the table
- Disabled channels stay highlighted in both views
- The selected view is remembered between sessions
- Added translations for English, French, German, Spanish, and Italian

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
