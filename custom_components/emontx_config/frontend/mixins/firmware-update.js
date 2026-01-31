/**
 * Firmware Update Mixin
 * Handles checking for firmware updates from GitHub releases
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
            // Manual check - always perform
            if (!this.device.firmware_version) {
                this.log('No firmware version available', 'warning');
                return;
            }

            await this.doFirmwareCheck(true);
        },

        async doFirmwareCheck(force = false) {
            this.checkingFirmware = true;

            try {
                const response = await fetch('https://api.github.com/repos/openenergymonitor/emon32-fw/releases/latest');
                if (!response.ok) {
                    this.log('Could not fetch firmware releases', 'warning');
                    return;
                }

                const release = await response.json();
                const latestVersion = release.tag_name.replace(/^v/, '');
                this.latestFirmwareVersion = latestVersion;

                // Store last check time
                const storage = window.parent.localStorage || localStorage;
                storage.setItem('emontx_firmware_last_check', Date.now().toString());

                // Compare versions
                const current = this.device.firmware_version;
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

            const storage = window.parent.localStorage || localStorage;
            const lastCheck = parseInt(storage.getItem('emontx_firmware_last_check') || '0');
            const now = Date.now();
            const elapsed = now - lastCheck;

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
            const storage = window.parent.localStorage || localStorage;
            storage.setItem('emontx_firmware_check_frequency', frequency);
        },

        loadFirmwareCheckFrequency() {
            const storage = window.parent.localStorage || localStorage;
            const saved = storage.getItem('emontx_firmware_check_frequency');
            if (saved) {
                this.firmwareCheckFrequency = saved;
            }
        },

        isNewerVersion(latest, current) {
            // Compare semantic versions (e.g., "1.2.3" vs "1.2.2")
            const latestParts = latest.split('.').map(Number);
            const currentParts = current.split('.').map(Number);

            for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
                const l = latestParts[i] || 0;
                const c = currentParts[i] || 0;
                if (l > c) return true;
                if (l < c) return false;
            }
            return false;
        }
    }
};
