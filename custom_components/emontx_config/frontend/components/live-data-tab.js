/**
 * Live Data Tab Component
 * Displays real-time sensor data from the emonPi/Tx device
 */
Vue.component('live-data-tab', {
    props: {
        t: Object,
        device: Object,
        liveData: Object,
        hasUnsavedChanges: Boolean,
        configReceived: Boolean
    },
    computed: {
        groupedLiveData() {
            // Group live data by prefix (V, P, E, etc.)
            // Include all channels from device config, even if disabled (show "-")
            const groups = {};
            const order = ['MSG', 'V', 'P', 'E', 'T', 'pulse'];

            // First, add all data from liveData
            for (const key in this.liveData) {
                const match = key.match(/^([A-Za-z]+)/);
                const prefix = match ? match[1] : 'Other';

                if (!groups[prefix]) {
                    groups[prefix] = {};
                }
                groups[prefix][key] = this.liveData[key];
            }

            // For emonPi3, add all channels including inactive ones
            if (this.device.hardware === 'emonPi3' && this.configReceived) {
                // Add voltage channels
                if (!groups['V']) groups['V'] = {};
                for (let i = 0; i < this.device.vchannels.length; i++) {
                    const key = 'V' + (i + 1);
                    if (!(key in groups['V'])) {
                        groups['V'][key] = '-';
                    }
                }

                // Add power channels
                if (!groups['P']) groups['P'] = {};
                for (let i = 0; i < this.device.ichannels.length; i++) {
                    const key = 'P' + (i + 1);
                    if (!(key in groups['P'])) {
                        groups['P'][key] = '-';
                    }
                }

                // Add energy channels
                if (!groups['E']) groups['E'] = {};
                for (let i = 0; i < this.device.ichannels.length; i++) {
                    const key = 'E' + (i + 1);
                    if (!(key in groups['E'])) {
                        groups['E'][key] = '-';
                    }
                }
            }

            // Sort groups by defined order
            const sortedGroups = {};
            for (const prefix of order) {
                if (groups[prefix]) {
                    const sortedKeys = Object.keys(groups[prefix]).sort((a, b) => {
                        const numA = parseInt(a.replace(/\D/g, '')) || 0;
                        const numB = parseInt(b.replace(/\D/g, '')) || 0;
                        return numA - numB;
                    });
                    sortedGroups[prefix] = {};
                    for (const key of sortedKeys) {
                        sortedGroups[prefix][key] = groups[prefix][key];
                    }
                }
            }
            // Add any remaining groups not in order
            for (const prefix in groups) {
                if (!sortedGroups[prefix]) {
                    sortedGroups[prefix] = groups[prefix];
                }
            }

            return sortedGroups;
        }
    },
    methods: {
        getGroupLabel(group) {
            if (this.t.liveData && this.t.liveData.groups) {
                if (this.t.liveData.groups[group]) {
                    return this.t.liveData.groups[group];
                }
                if (this.t.liveData.groups[group.toUpperCase()]) {
                    return this.t.liveData.groups[group.toUpperCase()];
                }
                if (this.t.liveData.groups[group.toLowerCase()]) {
                    return this.t.liveData.groups[group.toLowerCase()];
                }
            }
            return group;
        },
        isChannelInactive(key) {
            if (this.device.hardware !== 'emonPi3') {
                return false;
            }
            // Check power/energy channels
            const ctMatch = key.match(/^[PE](\d+)$/);
            if (ctMatch) {
                const channelNum = parseInt(ctMatch[1]) - 1;
                if (channelNum >= 0 && channelNum < this.device.ichannels.length) {
                    return this.device.ichannels[channelNum].active === false;
                }
            }
            // Check voltage channels
            const vMatch = key.match(/^V(\d+)$/);
            if (vMatch) {
                const channelNum = parseInt(vMatch[1]) - 1;
                if (channelNum >= 0 && channelNum < this.device.vchannels.length) {
                    return this.device.vchannels[channelNum].active === false;
                }
            }
            return false;
        }
    },
    template: `
        <div class="tab-content">
            <!-- Unsaved Changes Warning Banner -->
            <div v-if="hasUnsavedChanges" class="alert alert-danger" style="display: flex; align-items: center; justify-content: space-between;">
                <span><strong>{{ t.unsavedChanges.title }}</strong> {{ t.unsavedChanges.message }}</span>
                <button class="btn btn-warning" @click="$emit('save-config')" style="margin-left: 15px;">{{ t.buttons.save }}</button>
            </div>

            <div class="card">
                <div class="card-header">{{ t.liveData.title }}</div>
                <div class="card-body">
                    <div v-if="Object.keys(liveData).length === 0" class="alert alert-info">
                        {{ t.liveData.waiting }}
                    </div>
                    <div v-else>
                        <div v-for="(items, group) in groupedLiveData" :key="group" style="margin-bottom: 15px;">
                            <h4 style="margin: 0 0 8px 0; color: #666; font-size: 14px;">{{ getGroupLabel(group) }}</h4>
                            <div class="config-grid">
                                <div :class="['config-item', isChannelInactive(key) ? 'inactive' : '']" v-for="(value, key) in items" :key="key">
                                    <label>{{ key }}</label>
                                    <div class="value">{{ value }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
});
