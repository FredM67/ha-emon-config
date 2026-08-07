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
        configReceived: Boolean,
        channelNames: Object
    },
    data() {
        const store = window.parent.localStorage || localStorage;
        return {
            // 'measurement' = one group per measurement type (V, P, E, ...)
            // 'channel'     = one row per CT channel, one column per measurement
            viewMode: store.getItem('emontx_live_view_mode') || 'measurement'
        };
    },
    watch: {
        viewMode(newMode) {
            (window.parent.localStorage || localStorage).setItem('emontx_live_view_mode', newMode);
        }
    },
    computed: {
        // Measurement prefixes that are indexed by CT channel. These are the
        // ones that can be pivoted into a per-channel row.
        ctMetrics() {
            const all = ['P', 'E', 'I', 'PF', 'AP'];
            const groups = this.groupedLiveData;
            return all.filter(prefix => groups[prefix] && Object.keys(groups[prefix]).length > 0);
        },
        ctChannelCount() {
            let count = this.device.ichannels.length;
            // Fall back to whatever the device reports if the config dump has
            // not arrived yet.
            for (const key in this.liveData) {
                const match = key.match(/^(?:PF|AP|[PEI])(\d+)$/);
                if (match) count = Math.max(count, parseInt(match[1]));
            }
            return count;
        },
        // One row per CT channel, one cell per measurement type.
        channelRows() {
            const groups = this.groupedLiveData;
            const rows = [];
            for (let n = 1; n <= this.ctChannelCount; n++) {
                const values = {};
                for (const prefix of this.ctMetrics) {
                    const key = prefix + n;
                    values[prefix] = (groups[prefix] && groups[prefix][key] !== undefined)
                        ? groups[prefix][key]
                        : '-';
                }
                rows.push({
                    num: n,
                    name: this.getFriendlyName('P' + n),
                    inactive: this.isChannelInactive('P' + n),
                    values: values
                });
            }
            return rows;
        },
        // Device-wide readings shown on a single line at the top of both views,
        // each group keeping its own heading.
        globalGroups() {
            const result = [];
            for (const prefix of ['MSG', 'V']) {
                const group = this.groupedLiveData[prefix];
                if (group && Object.keys(group).length > 0) {
                    result.push({ prefix: prefix, items: group });
                }
            }
            return result;
        },
        // Everything else that is not indexed by CT channel keeps the grouped
        // layout, below the channel table.
        nonChannelGroups() {
            const result = {};
            const skip = this.ctMetrics.concat(['MSG', 'V']);
            for (const prefix in this.groupedLiveData) {
                if (skip.indexOf(prefix) === -1) {
                    result[prefix] = this.groupedLiveData[prefix];
                }
            }
            return result;
        },
        // Same as groupedLiveData, minus the device-wide readings which both
        // views render on their own single line at the top.
        measurementGroups() {
            const result = {};
            for (const prefix in this.groupedLiveData) {
                if (prefix !== 'MSG' && prefix !== 'V') {
                    result[prefix] = this.groupedLiveData[prefix];
                }
            }
            return result;
        },
        groupedLiveData() {
            // Group live data by prefix (V, P, E, etc.)
            // Include all channels from device config, even if disabled (show "-")
            const groups = {};
            const order = ['MSG', 'V', 'P', 'E', 'I', 'PF', 'AP', 'T', 'pulse'];

            // First, add all data from liveData
            for (const key in this.liveData) {
                const match = key.match(/^([A-Za-z]+)/);
                const prefix = match ? match[1] : 'Other';

                if (!groups[prefix]) {
                    groups[prefix] = {};
                }
                groups[prefix][key] = this.formatValue(key, this.liveData[key]);
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

                // Verbose mode ('c2') groups: current, power factor, apparent power.
                // Only fill in placeholders once the group exists, otherwise the
                // whole group would appear empty in non-verbose mode.
                for (const prefix of ['I', 'PF', 'AP']) {
                    if (!groups[prefix]) continue;
                    for (let i = 0; i < this.device.ichannels.length; i++) {
                        const key = prefix + (i + 1);
                        if (!(key in groups[prefix])) {
                            groups[prefix][key] = '-';
                        }
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
            let label = group;
            if (this.t.liveData && this.t.liveData.groups) {
                if (this.t.liveData.groups[group]) {
                    label = this.t.liveData.groups[group];
                } else if (this.t.liveData.groups[group.toUpperCase()]) {
                    label = this.t.liveData.groups[group.toUpperCase()];
                } else if (this.t.liveData.groups[group.toLowerCase()]) {
                    label = this.t.liveData.groups[group.toLowerCase()];
                }
            }

            // Add units for specific groups
            const units = {
                'V': 'V',
                'P': 'W',
                'E': 'Wh',
                'I': 'A',
                'AP': 'VA',
                'T': '°C'
            };

            if (units[group]) {
                return label + ' (' + units[group] + ')';
            }

            return label;
        },
        getMetricLabel(prefix) {
            // Short column header for the per-channel view: the translated group
            // name without the trailing unit (values already carry their unit).
            if (this.t.liveData && this.t.liveData.groups && this.t.liveData.groups[prefix]) {
                return this.t.liveData.groups[prefix];
            }
            return prefix;
        },
        isChannelInactive(key) {
            if (this.device.hardware !== 'emonPi3') {
                return false;
            }
            // Check CT-derived channels (power, energy, and the verbose-mode
            // current / power factor / apparent power)
            const ctMatch = key.match(/^(?:PF|AP|[PEI])(\d+)$/);
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
        },
        formatValue(key, value) {
            // Format values with proper SI units and spacing
            const num = parseFloat(value);
            if (isNaN(num)) return value;

            // Voltage (V1, V2, etc.) - 2 decimals
            if (key.match(/^V\d+$/)) {
                return num.toFixed(2) + ' V';
            }
            // Power (P1, P2, etc.)
            if (key.match(/^P\d+$/)) {
                return num.toFixed(1) + ' W';
            }
            // Energy (E1, E2, etc.)
            if (key.match(/^E\d+$/)) {
                return num.toFixed(0) + ' Wh';
            }
            // Current (I1, I2, etc.)
            if (key.match(/^I\d+$/)) {
                return num.toFixed(2) + ' A';
            }
            // Power factor (PF1, PF2, etc.) - unitless
            if (key.match(/^PF\d+$/)) {
                return num.toFixed(2);
            }
            // Apparent power (AP1, AP2, etc.)
            if (key.match(/^AP\d+$/)) {
                return num.toFixed(0) + ' VA';
            }
            // Temperature (T1, T2, etc.)
            if (key.match(/^T\d+$/)) {
                return num.toFixed(1) + ' °C';
            }
            return value;
        },
        getFriendlyName(key) {
            // Get friendly name for a channel key
            if (!this.channelNames) return null;

            // Voltage channels: V1, V2, V3
            const vMatch = key.match(/^V(\d+)$/);
            if (vMatch) {
                return this.channelNames.voltage && this.channelNames.voltage[vMatch[1]];
            }

            // CT-derived channels: P1, E1, I1, PF1, AP1, etc. -> use CT names
            const peMatch = key.match(/^(?:PF|AP|[PEI])(\d+)$/);
            if (peMatch) {
                return this.channelNames.ct && this.channelNames.ct[peMatch[1]];
            }

            // Temperature channels: T1, T2, etc.
            const tMatch = key.match(/^T(\d+)$/);
            if (tMatch && this.device.tempSensors) {
                const slot = parseInt(tMatch[1]);
                // Find sensor by slot number
                const sensor = this.device.tempSensors.find(s => (s.slot || 0) === slot);
                if (sensor) {
                    return this.channelNames.temp && this.channelNames.temp[sensor.addr];
                }
            }

            // Pulse channels: pulse1, pulse2, etc.
            const pulseMatch = key.match(/^pulse(\d+)$/);
            if (pulseMatch) {
                return this.channelNames.opa && this.channelNames.opa[pulseMatch[1]];
            }

            return null;
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
                <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                    <span>{{ t.liveData.title }}</span>
                    <div class="view-mode-toggle" v-if="Object.keys(liveData).length > 0">
                        <label :class="{ active: viewMode === 'measurement' }">
                            <input type="radio" value="measurement" v-model="viewMode" />
                            {{ t.liveData.viewByMeasurement }}
                        </label>
                        <label :class="{ active: viewMode === 'channel' }">
                            <input type="radio" value="channel" v-model="viewMode" />
                            {{ t.liveData.viewByChannel }}
                        </label>
                    </div>
                </div>
                <div class="card-body">
                    <div v-if="Object.keys(liveData).length === 0" class="alert alert-info">
                        {{ t.liveData.waiting }}
                    </div>

                    <!-- Device-wide readings (message counter, voltages) on a
                         single line, identical in both views -->
                    <div v-if="globalGroups.length > 0" class="global-readings">
                        <div v-for="group in globalGroups" :key="group.prefix" class="global-readings-group">
                            <h4 style="margin: 0 0 8px 0; color: #666; font-size: 14px;">{{ getGroupLabel(group.prefix) }}</h4>
                            <div class="global-readings-items">
                                <div class="config-item" v-for="(value, key) in group.items" :key="key">
                                    <label>{{ key }}</label>
                                    <div class="value">{{ value }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Grouped by measurement type -->
                    <div v-if="Object.keys(liveData).length > 0 && viewMode === 'measurement'">
                        <div v-for="(items, group) in measurementGroups" :key="group" style="margin-bottom: 15px;">
                            <h4 style="margin: 0 0 8px 0; color: #666; font-size: 14px;">{{ getGroupLabel(group) }}</h4>
                            <div class="config-grid">
                                <div :class="['config-item', isChannelInactive(key) ? 'inactive' : '']" v-for="(value, key) in items" :key="key">
                                    <label>{{ key }}<span v-if="getFriendlyName(key)" class="friendly-name"> - {{ getFriendlyName(key) }}</span></label>
                                    <div class="value">{{ value }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- One row per channel -->
                    <div v-else-if="Object.keys(liveData).length > 0">
                        <div v-if="ctMetrics.length > 0" class="table-responsive">
                            <table class="device-info-table">
                                <tr>
                                    <th>{{ t.accumulators.channel }}</th>
                                    <th>{{ t.config.name }}</th>
                                    <th v-for="prefix in ctMetrics" :key="prefix">{{ getMetricLabel(prefix) }}</th>
                                </tr>
                                <tr v-for="row in channelRows" :key="row.num" :class="{ 'inactive-row': row.inactive }">
                                    <td>{{ row.num }}</td>
                                    <td>
                                        <span v-if="row.name" class="friendly-name">{{ row.name }}</span>
                                        <span v-else style="color: #999;">-</span>
                                    </td>
                                    <td v-for="prefix in ctMetrics" :key="prefix">{{ row.values[prefix] }}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Measurements that are not per-CT keep the grouped layout -->
                        <div v-for="(items, group) in nonChannelGroups" :key="group" style="margin-bottom: 15px;">
                            <h4 style="margin: 0 0 8px 0; color: #666; font-size: 14px;">{{ getGroupLabel(group) }}</h4>
                            <div class="config-grid">
                                <div :class="['config-item', isChannelInactive(key) ? 'inactive' : '']" v-for="(value, key) in items" :key="key">
                                    <label>{{ key }}<span v-if="getFriendlyName(key)" class="friendly-name"> - {{ getFriendlyName(key) }}</span></label>
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
