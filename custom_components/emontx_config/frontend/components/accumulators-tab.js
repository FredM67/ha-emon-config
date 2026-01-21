/**
 * Accumulators Tab Component
 * Displays and manages energy and pulse accumulators
 */
Vue.component('accumulators-tab', {
    props: {
        t: Object,
        device: Object,
        liveData: Object,
        emontxConnected: Boolean,
        hasUnsavedChanges: Boolean
    },
    computed: {
        energyChannelCount() {
            if (this.device.hardware === 'emonPi3') {
                return 12;
            }
            return this.device.ichannels.length || 6;
        },
        pulseChannelCount() {
            return this.device.hardware === 'emonPi3' ? 2 : 1;
        }
    },
    methods: {
        isEnergyChannelActive(n) {
            const channel = this.device.ichannels[n - 1];
            if (!channel) return true;
            if (this.device.hardware === 'emonPi3') {
                return channel.active !== false;
            }
            return true;
        }
    },
    template: `
        <div class="tab-content">
            <!-- Unsaved Changes Warning Banner -->
            <div v-if="hasUnsavedChanges" class="alert alert-danger" style="display: flex; align-items: center; justify-content: space-between;">
                <span><strong>{{ t.unsavedChanges.title }}</strong> {{ t.unsavedChanges.message }}</span>
                <button class="btn btn-warning" @click="$emit('save-config')" style="margin-left: 15px;">{{ t.buttons.save }}</button>
            </div>

            <!-- Explanation -->
            <div class="alert alert-info">
                {{ (t.accumulators && t.accumulators.explanation) || 'Use this page to reset the values stored on the emonTx/emonPi to zero. This action cannot be undone.' }}
            </div>

            <div class="card">
                <div class="card-header">{{ (t.accumulators && t.accumulators.energyTitle) || 'Energy Accumulators' }}</div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="device-info-table">
                            <tr>
                                <th>{{ (t.accumulators && t.accumulators.channel) || 'Channel' }}</th>
                                <th>{{ (t.accumulators && t.accumulators.value) || 'Value' }}</th>
                                <th v-if="device.hardware === 'emonPi3'">{{ (t.accumulators && t.accumulators.status) || 'Status' }}</th>
                                <th v-if="device.hardware === 'emonPi3'">{{ (t.accumulators && t.accumulators.action) || 'Action' }}</th>
                            </tr>
                            <tr v-for="n in energyChannelCount" :key="'e'+n" :class="{ 'inactive-row': !isEnergyChannelActive(n) }">
                                <td>E{{ n }}</td>
                                <td>{{ liveData['E' + n] || '0' }} Wh</td>
                                <td v-if="device.hardware === 'emonPi3'">
                                    <span v-if="isEnergyChannelActive(n)" style="color: #4CAF50;">{{ (t.accumulators && t.accumulators.active) || 'Active' }}</span>
                                    <span v-else style="color: #999;">{{ (t.accumulators && t.accumulators.inactive) || 'Inactive' }}</span>
                                </td>
                                <td v-if="device.hardware === 'emonPi3'">
                                    <button class="btn btn-sm btn-danger" @click="$emit('show-individual-zero', 'e', n)" :disabled="!emontxConnected">
                                        {{ (t.accumulators && t.accumulators.zero) || 'Zero' }}
                                    </button>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">{{ (t.accumulators && t.accumulators.pulseTitle) || 'Pulse Accumulators' }}</div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="device-info-table">
                            <tr>
                                <th>{{ (t.accumulators && t.accumulators.channel) || 'Channel' }}</th>
                                <th>{{ (t.accumulators && t.accumulators.value) || 'Value' }}</th>
                                <th v-if="device.hardware === 'emonPi3'">{{ (t.accumulators && t.accumulators.action) || 'Action' }}</th>
                            </tr>
                            <tr v-for="n in pulseChannelCount" :key="'p'+n">
                                <td>Pulse {{ n }}</td>
                                <td>{{ liveData['pulse' + n] || '0' }}</td>
                                <td v-if="device.hardware === 'emonPi3'">
                                    <button class="btn btn-sm btn-danger" @click="$emit('show-individual-zero', 'p', n)" :disabled="!emontxConnected">
                                        {{ (t.accumulators && t.accumulators.zero) || 'Zero' }}
                                    </button>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>

            <div class="button-group">
                <button class="btn btn-danger" @click="$emit('zero-energy')" :disabled="!emontxConnected">{{ (t.accumulators && t.accumulators.zeroAll) || 'Zero All Accumulators' }}</button>
            </div>
        </div>
    `
});
