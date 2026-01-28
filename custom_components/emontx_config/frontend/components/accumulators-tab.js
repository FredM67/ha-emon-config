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
        hasUnsavedChanges: Boolean,
        channelNames: Object
    },
    computed: {
        energyChannelCount() {
            if (this.device.hardware === 'emonPi3') {
                return 12;
            }
            return this.device.ichannels.length || 6;
        },
        pulseChannelCount() {
            return this.device.hardware === 'emonPi3' ? 3 : 1;
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
        },
        getCtName(n) {
            return this.channelNames && this.channelNames.ct && this.channelNames.ct[String(n)];
        },
        getOpaName(n) {
            return this.channelNames && this.channelNames.opa && this.channelNames.opa[String(n)];
        }
    },
    template: `
        <div class="tab-content">
            <!-- Unsaved Changes Warning Banner -->
            <div v-if="hasUnsavedChanges" class="alert alert-danger" style="display: flex; align-items: center; justify-content: space-between;">
                <span><strong>{{ t.unsavedChanges.title }}</strong> {{ t.unsavedChanges.message }}</span>
                <button class="btn btn-warning" @click="$emit('save-config')" style="margin-left: 15px;">{{ t.buttons.save }}</button>
            </div>

            <!-- Explanation and Zero All button -->
            <div class="alert alert-info" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <span>{{ t.accumulators.explanation }}</span>
                <button class="btn btn-danger" @click="$emit('zero-energy')" :disabled="!emontxConnected" :title="t.tooltips.btnZeroAll">{{ t.accumulators.zeroAll }}</button>
            </div>

            <div class="card">
                <div class="card-header">{{ t.accumulators.energyTitle }}</div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="device-info-table">
                            <tr>
                                <th>{{ t.accumulators.channel }}</th>
                                <th>{{ t.config.name }}</th>
                                <th>{{ t.accumulators.value }}</th>
                                <th v-if="device.hardware === 'emonPi3'">{{ t.accumulators.status }}</th>
                                <th v-if="device.hardware === 'emonPi3'">{{ t.accumulators.action }}</th>
                            </tr>
                            <tr v-for="n in energyChannelCount" :key="'e'+n" :class="{ 'inactive-row': !isEnergyChannelActive(n) }">
                                <td>E{{ n }}</td>
                                <td><span v-if="getCtName(n)" class="friendly-name">{{ getCtName(n) }}</span><span v-else style="color: #999;">-</span></td>
                                <td>{{ liveData['E' + n] || '0' }} Wh</td>
                                <td v-if="device.hardware === 'emonPi3'">
                                    <span v-if="isEnergyChannelActive(n)" style="color: #4CAF50;">{{ t.accumulators.active }}</span>
                                    <span v-else style="color: #999;">{{ t.accumulators.inactive }}</span>
                                </td>
                                <td v-if="device.hardware === 'emonPi3'">
                                    <button class="btn btn-sm btn-danger" @click="$emit('show-individual-zero', 'e', n)" :disabled="!emontxConnected" :title="t.tooltips.btnZeroIndividual">
                                        {{ t.accumulators.zero }} E{{ n }}
                                    </button>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">{{ t.accumulators.pulseTitle }}</div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="device-info-table">
                            <tr>
                                <th>{{ t.accumulators.channel }}</th>
                                <th>{{ t.config.name }}</th>
                                <th>{{ t.accumulators.value }}</th>
                                <th v-if="device.hardware === 'emonPi3'">{{ t.accumulators.action }}</th>
                            </tr>
                            <tr v-for="n in pulseChannelCount" :key="'p'+n">
                                <td>Pulse {{ n }}</td>
                                <td><span v-if="getOpaName(n)" class="friendly-name">{{ getOpaName(n) }}</span><span v-else style="color: #999;">-</span></td>
                                <td>{{ liveData['pulse' + n] || '0' }}</td>
                                <td v-if="device.hardware === 'emonPi3'">
                                    <button class="btn btn-sm btn-danger" @click="$emit('show-individual-zero', 'p', n)" :disabled="!emontxConnected" :title="t.tooltips.btnZeroPulse">
                                        {{ t.accumulators.zero }} Pulse {{ n }}
                                    </button>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `
});
