/**
 * Firmware Update Mixin
 * Handles checking for firmware updates from GitHub releases and flashing
 * via the ESPHome emontx_updater component service.
 */
const FirmwareUpdateMixin = {
    methods: {
        async checkFirmwareUpdate() {
            // Auto-check based on frequency setting
            if (!this.device.firmware_version) return;
            if (!this.shouldCheckFirmware()) return;

            await this.doFirmwareCheck();
        },

        async checkFirmwareNow() {
            // Manual check — always fetch GitHub releases, even if device firmware
            // version is unknown (e.g. after a corrupt flash).  We treat the current
            // version as '0.0.0' in that case so the latest release always shows as
            // available, giving the user the option to reflash.
            await this.doFirmwareCheck(true);
        },

        async doFirmwareCheck(force = false) {
            this.checkingFirmware = true;

            try {
                // Fetch releases and find the latest non-prerelease
                const response = await fetch('https://api.github.com/repos/openenergymonitor/emon32-fw/releases');
                if (!response.ok) {
                    this.log('Could not fetch firmware releases', 'warning');
                    return;
                }

                const releases = await response.json();
                const stableRelease = releases.find(r => !r.prerelease && !r.draft);
                if (!stableRelease) {
                    if (force) this.log('No stable firmware release found', 'warning');
                    return;
                }

                const latestVersion = stableRelease.tag_name.replace(/^[vV]/, '');
                this.latestFirmwareVersion = latestVersion;

                // Extract the .bin asset download URL for flashing
                const binAsset = stableRelease.assets
                    ? stableRelease.assets.find(a => a.name && a.name.endsWith('.bin'))
                    : null;
                this.latestFirmwareBinUrl = binAsset ? binAsset.browser_download_url : null;

                // Store last check time on HA side
                this.firmwareLastCheck = Date.now();
                this.saveFirmwareSettings();

                // Compare versions (strip V/v prefix from device version).
                // If firmware_version is unknown (e.g. corrupt device), treat current
                // as '0.0.0' so any release shows as an available update.
                const current = (this.device.firmware_version || '0.0.0').replace(/^[vV]/, '');
                if (this.isNewerVersion(latestVersion, current)) {
                    this.firmwareUpdateAvailable = true;
                    this.log(`Firmware update available: ${current} → ${latestVersion}`, 'info');
                } else {
                    this.firmwareUpdateAvailable = false;
                    if (force) {
                        this.log(`Firmware is up to date (${current})`, 'info');
                    }
                }
            } catch (e) {
                this.log('Could not check for firmware updates', 'warning');
            } finally {
                this.checkingFirmware = false;
            }
        },

        shouldCheckFirmware() {
            if (this.firmwareCheckFrequency === 'never') return false;

            const now = Date.now();
            const elapsed = now - this.firmwareLastCheck;

            const intervals = {
                'daily': 24 * 60 * 60 * 1000,
                'weekly': 7 * 24 * 60 * 60 * 1000,
                'monthly': 30 * 24 * 60 * 60 * 1000
            };

            const interval = intervals[this.firmwareCheckFrequency] || intervals['weekly'];
            return elapsed >= interval;
        },

        updateFirmwareFrequency(frequency) {
            this.firmwareCheckFrequency = frequency;
            this.saveFirmwareSettings();
        },

        async loadFirmwareSettings() {
            try {
                if (this.hass && this.hass.callWS) {
                    const result = await this.hass.callWS({ type: 'emontx_config/get_firmware_settings' });
                    if (result && result.firmware_settings) {
                        const settings = result.firmware_settings;
                        if (settings.check_frequency) {
                            this.firmwareCheckFrequency = settings.check_frequency;
                        }
                        if (settings.last_check) {
                            this.firmwareLastCheck = settings.last_check;
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load firmware settings:', e);
            }
        },

        async saveFirmwareSettings() {
            try {
                if (this.hass && this.hass.callWS) {
                    await this.hass.callWS({
                        type: 'emontx_config/save_firmware_settings',
                        firmware_settings: {
                            check_frequency: this.firmwareCheckFrequency,
                            last_check: this.firmwareLastCheck
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to save firmware settings:', e);
            }
        },

        isNewerVersion(latest, current) {
            // Strip leading V/v prefix and any pre-release suffix (e.g., "-test", "-beta")
            const clean = (v) => v.replace(/^[vV]/, '').replace(/-.*$/, '');

            const latestParts = clean(latest).split('.').map(Number);
            const currentParts = clean(current).split('.').map(Number);

            for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
                const l = latestParts[i] || 0;
                const c = currentParts[i] || 0;
                if (isNaN(l) || isNaN(c)) return false;
                if (l > c) return true;
                if (l < c) return false;
            }
            return false;
        },

        // ── Firmware flashing ──────────────────────────────────────────────

        /**
         * Call the ESPHome flash_emontx6 service with the latest release .bin URL.
         * The ESPHome component fires esphome.emontx_flash_status events as it progresses.
         */
        flashFirmware() {
            if (!this.latestFirmwareBinUrl) {
                this.log('No firmware binary URL available — run a firmware check first', 'warning');
                return;
            }
            this.flashingFirmware = true;
            this.flashStatus = 'started';
            this.flashProgress = 0;

            const service = this.deviceName + '_flash_emontx6';
            if (this.hass && this.hass.callService) {
                this.hass.callService('esphome', service, { url: this.latestFirmwareBinUrl });
            } else if (this.ws) {
                this.ws.send(JSON.stringify({
                    id: this.wsMessageId++,
                    type: 'call_service',
                    domain: 'esphome',
                    service: service,
                    service_data: { url: this.latestFirmwareBinUrl }
                }));
            }
        },

        /**
         * Handle esphome.emontx_flash_status events fired by the ESPHome component.
         * Called by connection.js subscribeToEvents (hass path) and handleWsMessage (WS path).
         */
        handleFlashStatus(data) {
            // Filter by device — ESPHome device_id matches the selectedDevice name
            if (data.device_id) {
                const normalizedEvent = data.device_id.replace(/_/g, '-');
                const normalizedSelected = this.selectedDevice.replace(/_/g, '-');
                if (normalizedEvent !== normalizedSelected) return;
            }

            this.flashStatus = data.status;
            this.flashProgress = parseInt(data.progress || 0);

            if (data.status === 'complete') {
                this.flashingFirmware = false;
                this.firmwareUpdateAvailable = false;
                this.log('Firmware flash complete — device is rebooting', 'info');
            } else if (data.status === 'failed') {
                this.flashingFirmware = false;
                this.log('Firmware flash failed: ' + (data.message || 'unknown error'), 'error');
            }
        }
    }
};
