/**
 * Channel Names Mixin
 * Handles channel names management (per device)
 */
const ChannelNamesMixin = {
    methods: {
        async loadChannelNames() {
            try {
                if (this.hass && this.hass.callWS) {
                    const result = await this.hass.callWS({ type: 'emontx_config/get_channel_names' });
                    if (result && result.channel_names) {
                        this.allChannelNames = result.channel_names;
                        this.updateChannelNamesForDevice();
                        console.log('Loaded channel names:', this.allChannelNames);
                    }
                }
            } catch (e) {
                console.error('Failed to load channel names:', e);
            }
        },

        updateChannelNamesForDevice() {
            // Set channelNames for current selected device
            const deviceNames = this.allChannelNames[this.selectedDevice] || {};
            this.channelNames = {
                ct: JSON.parse(JSON.stringify(deviceNames.ct || {})),
                voltage: JSON.parse(JSON.stringify(deviceNames.voltage || {})),
                opa: JSON.parse(JSON.stringify(deviceNames.opa || {})),
                temp: JSON.parse(JSON.stringify(deviceNames.temp || {}))
            };
            // Store original for change detection
            this.originalChannelNames = {
                ct: JSON.parse(JSON.stringify(deviceNames.ct || {})),
                voltage: JSON.parse(JSON.stringify(deviceNames.voltage || {})),
                opa: JSON.parse(JSON.stringify(deviceNames.opa || {})),
                temp: JSON.parse(JSON.stringify(deviceNames.temp || {}))
            };
        },

        async saveChannelNames() {
            console.log('saveChannelNames called (should only happen on Apply or Import)');
            try {
                if (this.hass && this.hass.callWS) {
                    // Update allChannelNames with current device's names
                    this.$set(this.allChannelNames, this.selectedDevice, JSON.parse(JSON.stringify(this.channelNames)));
                    await this.hass.callWS({
                        type: 'emontx_config/save_channel_names',
                        channel_names: this.allChannelNames
                    });
                    console.log('Saved channel names:', this.allChannelNames);
                }
            } catch (e) {
                console.error('Failed to save channel names:', e);
            }
        },

        updateChannelName(type, key, name) {
            // Update a single channel name (no auto-save, use Apply Changes button)
            console.log('updateChannelName called:', type, key, name, '(no auto-save)');
            if (!this.channelNames[type]) {
                this.$set(this.channelNames, type, {});
            }
            if (name && name.trim()) {
                this.$set(this.channelNames[type], key, name.trim());
            } else {
                // Remove empty names
                this.$delete(this.channelNames[type], key);
            }
        },

        hasChannelNameChanges() {
            // Compare current channelNames with originalChannelNames
            const types = ['ct', 'voltage', 'opa', 'temp'];
            for (const type of types) {
                const curr = this.channelNames[type] || {};
                const orig = this.originalChannelNames[type] || {};
                // Check all keys in both objects
                const allKeys = new Set([...Object.keys(curr), ...Object.keys(orig)]);
                for (const key of allKeys) {
                    if ((curr[key] || '') !== (orig[key] || '')) {
                        console.log('Channel name change detected:', type, key, 'curr:', curr[key], 'orig:', orig[key]);
                        return true;
                    }
                }
            }
            return false;
        },

        markChannelNamesAsApplied() {
            // Update originalChannelNames to match current (after successful save)
            this.originalChannelNames = JSON.parse(JSON.stringify(this.channelNames));
        },

        discardChannelNameChanges() {
            // Revert channelNames to original
            this.channelNames = JSON.parse(JSON.stringify(this.originalChannelNames));
        },

        exportChannelNames() {
            const data = {
                version: 1,
                exported: new Date().toISOString(),
                channel_names: this.allChannelNames
            };
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `emontx-channel-names-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.log('Channel names exported', 'info');
        },

        importChannelNames(file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.channel_names) {
                        throw new Error('Invalid file format');
                    }
                    this.allChannelNames = data.channel_names;
                    this.updateChannelNamesForDevice();
                    await this.saveChannelNames();
                    this.log('Channel names imported successfully', 'info');
                } catch (err) {
                    this.log('Failed to import channel names: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        }
    }
};
