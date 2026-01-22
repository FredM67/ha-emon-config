/**
 * Config Tab Component
 * Handles device configuration with sub-tabs for calibration, sensors, and misc settings
 */
Vue.component('config-tab', {
    props: {
        device: Object,
        t: Object,
        emontxConnected: Boolean,
        configReceived: Boolean,
        upgradeRequired: Boolean,
        hasUnsavedChanges: Boolean,
        changes: Boolean,
        liveData: Object,
        ctsAvailable: Array
    },
    data() {
        return {
            configSubTab: 'calibration',
            customCtChannels: {}  // Track which channels are using custom CT values
        };
    },
    methods: {
        isCustomCt(ical) {
            return !this.ctsAvailable.includes(ical);
        },
        getCtSelectValue(index) {
            const ical = this.device.ichannels[index].ical;
            if (this.customCtChannels[index] || this.isCustomCt(ical)) {
                return 'custom';
            }
            return ical;
        },
        handleCtTypeChange(index, event) {
            const value = event.target.value;
            if (value === 'custom') {
                this.$set(this.customCtChannels, index, true);
            } else {
                this.$set(this.customCtChannels, index, false);
                this.device.ichannels[index].ical = parseInt(value);
                this.$emit('set-ical', index);
            }
        },
        handleCustomCtChange(index) {
            this.$emit('set-ical', index);
        },
        handleOpaFuncChange(idx, event) {
            const newFunc = event.target.value;
            const opa = this.device.opa[idx];
            const oldFunc = opa.func;

            // Update the function
            opa.func = newFunc;

            // Auto-configure based on the new function
            if (newFunc === 'o') {
                // Switching to OneWire: enable pull-up (required for DS18B20)
                opa.pullUp = true;
            } else if (oldFunc === 'o') {
                // Switching from OneWire to Pulse: set recommended defaults
                opa.pullUp = false;
                opa.period = 100;  // 100ms default debounce
            }

            this.$emit('set-opa', idx);
        }
    },
    template: `
        <form autocomplete="off" @submit.prevent>
        <div class="tab-content active">
            <!-- Unsaved Changes Warning Banner -->
            <div v-if="hasUnsavedChanges" class="alert alert-danger" style="display: flex; align-items: center; justify-content: space-between;">
                <span><strong>{{ t.unsavedChanges.title }}</strong> {{ t.unsavedChanges.message }}</span>
                <button class="btn btn-warning" @click="$emit('save-config')" style="margin-left: 15px;">{{ t.buttons.save }}</button>
            </div>

            <div v-if="!configReceived" class="alert alert-info">
                {{ t.config.waiting }} {{ t.config.clickLoad }}
                <button class="btn btn-primary" style="margin-left: 15px;" @click="$emit('load-config')" :disabled="!emontxConnected">{{ t.buttons.loadConfig }}</button>
            </div>

            <div v-if="upgradeRequired" class="alert alert-danger">
                <b>{{ t.config.firmwareUpdateRequired }}</b> {{ t.config.firmwareUpdateMessage }}
            </div>

            <div v-if="configReceived && !upgradeRequired">
                <!-- Sub-tabs for config sections -->
                <div class="sub-tabs">
                    <div :class="['sub-tab', configSubTab === 'calibration' ? 'active' : '']" @click="configSubTab = 'calibration'">
                        {{ (t.configTabs && t.configTabs.calibration) || 'Calibration' }}
                    </div>
                    <div :class="['sub-tab', configSubTab === 'sensors' ? 'active' : '']" @click="configSubTab = 'sensors'">
                        {{ (t.configTabs && t.configTabs.sensors) || 'Sensors' }}
                    </div>
                    <div :class="['sub-tab', configSubTab === 'misc' ? 'active' : '']" @click="configSubTab = 'misc'">
                        {{ (t.configTabs && t.configTabs.misc) || 'Misc' }}
                    </div>
                </div>

                <!-- CALIBRATION SUB-TAB -->
                <div v-show="configSubTab === 'calibration'">

                <!-- Voltage Calibration (non-emonPi3) -->
                <div class="card" v-if="device.hardware !== 'emonPi3'">
                    <div class="card-header">{{ t.config.voltageCalibration }}</div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>{{ t.config.vCal }}</label>
                            <input type="number" step="0.001" v-model="device.vcal" @change="$emit('set-vcal')" :disabled="!emontxConnected" />
                            <span class="unit">%</span>
                        </div>
                    </div>
                </div>

                <!-- Multi-voltage for emonPi3 -->
                <div class="card" v-if="device.hardware === 'emonPi3'">
                    <div class="card-header">{{ t.config.voltageChannels }}</div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="config-table">
                                <tr>
                                    <th>{{ t.config.active }}</th>
                                    <th>{{ t.config.channel }}</th>
                                    <th>{{ t.config.calibration }}</th>
                                    <th>{{ t.config.phase }}</th>
                                </tr>
                                <tr v-for="(vchannel, index) in device.vchannels" :key="'v'+index">
                                    <td><input type="checkbox" v-model="vchannel.active" @change="$emit('set-vchannel', index)" :disabled="!emontxConnected" /></td>
                                    <td>V{{ index + 1 }}</td>
                                    <td>
                                        <input type="number" step="0.001" v-model="vchannel.vcal" @change="$emit('set-vchannel', index)" :disabled="!emontxConnected" />
                                        <span class="unit">%</span>
                                    </td>
                                    <td>
                                        <input type="number" step="0.01" v-model="vchannel.vphase" @change="$emit('set-vchannel', index)" :disabled="!emontxConnected" />
                                        <span class="unit">&deg;</span>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Current Channels -->
                <div class="card">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <span>{{ t.config.ctChannels }}</span>
                        <button v-if="device.hardware === 'emonPi3'" class="btn btn-sm btn-info" @click="$emit('open-bulk-ct')" :disabled="!emontxConnected" style="padding: 4px 12px; font-size: 12px;">
                            {{ (t.bulk && t.bulk.button) || 'Bulk Settings' }}
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="config-table">
                                <tr>
                                    <th v-if="device.hardware === 'emonPi3'">{{ t.config.active }}</th>
                                    <th>{{ t.config.channel }}</th>
                                    <th>{{ t.config.ctType }}</th>
                                    <th>{{ t.config.phase }}</th>
                                    <th v-if="device.hardware === 'emonPi3'">{{ t.config.vChan1 }}</th>
                                    <th v-if="device.hardware === 'emonPi3'">{{ t.config.vChan2 }}</th>
                                    <th>{{ t.config.power }}</th>
                                    <th>{{ t.config.energy }}</th>
                                </tr>
                                <tr v-for="(channel, index) in device.ichannels" :key="'i'+index">
                                    <td v-if="device.hardware === 'emonPi3'">
                                        <input type="checkbox" v-model="channel.active" @change="$emit('set-ical', index)" :disabled="!emontxConnected" />
                                    </td>
                                    <td>CT {{ index + 1 }}</td>
                                    <td style="display: flex; align-items: center; gap: 5px;">
                                        <select :value="getCtSelectValue(index)" @change="handleCtTypeChange(index, $event)" :disabled="!emontxConnected">
                                            <option v-for="rating in ctsAvailable" :value="rating" :key="rating">{{ rating }}A</option>
                                            <option value="custom">{{ (t.config && t.config.custom) || 'Custom' }}</option>
                                        </select>
                                        <input v-if="getCtSelectValue(index) === 'custom'"
                                               type="number" min="10" max="200"
                                               v-model.number="channel.ical"
                                               @change="handleCustomCtChange(index)"
                                               :disabled="!emontxConnected"
                                               style="width: 60px;" />
                                        <span v-if="getCtSelectValue(index) === 'custom'">A</span>
                                    </td>
                                    <td><input type="number" step="0.01" v-model.number="channel.ilead" @change="$emit('set-ical', index)" style="width:70px" :disabled="!emontxConnected" class="no-spinner" /></td>
                                    <td v-if="device.hardware === 'emonPi3'">
                                        <select v-model="channel.vchan1" @change="$emit('set-ical', index)" :disabled="!emontxConnected">
                                            <option v-for="v in [1,2,3]" :value="v" :key="v">{{ v }}</option>
                                        </select>
                                    </td>
                                    <td v-if="device.hardware === 'emonPi3'">
                                        <select v-model="channel.vchan2" @change="$emit('set-ical', index)" :disabled="!emontxConnected">
                                            <option v-for="v in [1,2,3]" :value="v" :key="v">{{ v }}</option>
                                        </select>
                                    </td>
                                    <td>{{ channel.power }}</td>
                                    <td>{{ channel.energy }}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                </div><!-- END CALIBRATION SUB-TAB -->

                <!-- SENSORS SUB-TAB -->
                <div v-show="configSubTab === 'sensors'">

                <!-- OPA Channels (OneWire/Pulse) -->
                <div class="card" v-if="device.hardware === 'emonPi3'">
                    <div class="card-header">{{ (t.config && t.config.opaChannels) || 'OPA Channels (OneWire/Pulse)' }}</div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="device-info-table">
                                <tr>
                                    <th>{{ (t.config && t.config.channel) || 'Channel' }}</th>
                                    <th>{{ (t.config && t.config.active) || 'Active' }}</th>
                                    <th>{{ (t.config && t.config.function) || 'Function' }}</th>
                                    <th>{{ (t.config && t.config.pullUp) || 'Pull-up' }}</th>
                                    <th>{{ (t.config && t.config.period) || 'Period (ms)' }}</th>
                                </tr>
                                <tr v-for="(opa, idx) in device.opa" :key="'opa'+idx">
                                    <td>OPA{{ idx + 1 }}</td>
                                    <td><input type="checkbox" v-model="opa.active" @change="$emit('set-opa', idx)" :disabled="!emontxConnected" /></td>
                                    <td>
                                        <select v-model="opa.func" @change="handleOpaFuncChange(idx, $event)" :disabled="!emontxConnected || idx === 2">
                                            <option value="o" v-if="idx !== 2">{{ (t.config && t.config.oneWire) || 'OneWire' }}</option>
                                            <option value="r">{{ (t.config && t.config.pulseRising) || 'Pulse - Rising' }}</option>
                                            <option value="f">{{ (t.config && t.config.pulseFalling) || 'Pulse - Falling' }}</option>
                                            <option value="b">{{ (t.config && t.config.pulseBoth) || 'Pulse - Both' }}</option>
                                        </select>
                                    </td>
                                    <td><input type="checkbox" v-model="opa.pullUp" @change="$emit('set-opa', idx)" :disabled="!emontxConnected || opa.func === 'o' || idx === 2" /></td>
                                    <td><input type="number" v-model="opa.period" @change="$emit('set-opa', idx)" :disabled="!emontxConnected || opa.func === 'o'" style="width:80px" /></td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Temperature Sensors -->
                <div class="card" v-if="device.hardware === 'emonPi3'">
                    <div class="card-header">{{ (t.config && t.config.tempSensors) || 'Temperature Sensors' }}</div>
                    <div class="card-body">
                        <p style="font-size: 13px; color: #666; margin-bottom: 15px;">
                            {{ (t.config && t.config.tempSensorsDesc) || 'DS18B20 OneWire temperature sensors connected to OPA channels configured as OneWire.' }}
                        </p>
                        <div class="button-group" style="margin-bottom: 15px;">
                            <button class="btn btn-primary" @click="$emit('scan-temp-sensors')" :disabled="!emontxConnected">
                                {{ (t.config && t.config.scanSensors) || 'Scan Sensors' }}
                            </button>
                            <button class="btn btn-info" @click="$emit('list-temp-sensors')" :disabled="!emontxConnected">
                                {{ (t.config && t.config.listSensors) || 'List Sensors' }}
                            </button>
                            <button class="btn btn-warning" @click="$emit('save-temp-mapping')" :disabled="!emontxConnected || device.tempSensors.length === 0">
                                {{ (t.config && t.config.saveMapping) || 'Save Mapping' }}
                            </button>
                        </div>
                        <div v-if="device.tempSensors.length > 0">
                            <table class="device-info-table">
                                <tr>
                                    <th>{{ (t.config && t.config.sensor) || 'Sensor' }}</th>
                                    <th>{{ (t.config && t.config.address) || 'Address' }}</th>
                                    <th>{{ (t.config && t.config.temperature) || 'Temperature' }}</th>
                                </tr>
                                <tr v-for="(sensor, idx) in device.tempSensors" :key="'temp'+idx">
                                    <td>T{{ idx + 1 }}</td>
                                    <td style="font-family: monospace; font-size: 12px;">{{ sensor.addr }}</td>
                                    <td>{{ liveData['T' + (idx + 1)] || '-' }}</td>
                                </tr>
                            </table>
                        </div>
                        <div v-else class="alert alert-info" style="margin: 0;">
                            {{ (t.config && t.config.noTempSensors) || 'No temperature sensors found. Click "Scan Sensors" to search for connected DS18B20 sensors.' }}
                        </div>
                    </div>
                </div>

                <!-- Pulse Settings (for non-emonPi3) -->
                <div class="card" v-if="device.hardware !== 'emonPi3'">
                    <div class="card-header">{{ t.config.pulseSettings || 'Pulse Settings' }}</div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="device-info-table">
                                <tr>
                                    <th>{{ t.config.pulseInput }}</th>
                                    <th>{{ t.config.pulsePeriod }}</th>
                                </tr>
                                <tr>
                                    <td><input type="checkbox" v-model="device.pulse" @change="$emit('set-pulse')" :disabled="!emontxConnected" /></td>
                                    <td><input type="number" v-model="device.pulsePeriod" @change="$emit('set-pulse-period')" :disabled="!emontxConnected" style="width:80px" /></td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                </div><!-- END SENSORS SUB-TAB -->

                <!-- MISC SUB-TAB -->
                <div v-show="configSubTab === 'misc'">

                <!-- Radio Settings -->
                <div class="card" v-if="device.hardware !== 'emonPi2'">
                    <div class="card-header">{{ t.config.radioSettings }}</div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>{{ t.config.radioEnabled }}</label>
                            <input type="checkbox" v-model="device.RF" @change="$emit('set-radio')" :disabled="!emontxConnected" />
                        </div>
                        <div class="table-responsive">
                            <table class="device-info-table">
                                <tr>
                                    <th>{{ t.config.nodeId }}</th>
                                    <th>{{ t.config.group }}</th>
                                    <th>{{ t.config.frequency }}</th>
                                    <th>{{ t.config.rfPower || 'Power' }}</th>
                                    <th>{{ t.config.format }}</th>
                                </tr>
                                <tr>
                                    <td><input type="number" v-model="device.rfNode" @change="$emit('set-rf-node')" :disabled="!emontxConnected" style="width:60px" /></td>
                                    <td><input type="number" v-model="device.rfGroup" @change="$emit('set-rf-group')" :disabled="!emontxConnected" style="width:60px" /></td>
                                    <td>
                                        <select v-model="device.rfBand" @change="$emit('set-rf-band')" :disabled="!emontxConnected">
                                            <option value="433 MHz">433 MHz</option>
                                            <option value="868 MHz">868 MHz</option>
                                            <option value="915 MHz">915 MHz</option>
                                        </select>
                                    </td>
                                    <td><input type="number" min="0" max="31" v-model="device.rfPower" @change="$emit('set-rf-power')" :disabled="!emontxConnected" style="width:60px" /></td>
                                    <td>{{ device.rfFormat }}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Datalog & Output Settings -->
                <div class="card">
                    <div class="card-header">{{ t.config.otherSettings }}</div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>{{ t.config.datalogInterval }}</label>
                            <input type="number" step="0.1" v-model="device.datalog" @change="$emit('set-datalog')" :disabled="!emontxConnected" style="width:80px" />
                            <span class="unit">s</span>
                        </div>
                        <div class="form-group">
                            <label>{{ t.config.jsonSerialFormat || 'JSON Serial Format' }}</label>
                            <input type="checkbox" v-model="device.json" :true-value="1" :false-value="0" @change="$emit('set-json')" :disabled="!emontxConnected" />
                        </div>
                    </div>
                </div>
                </div><!-- END MISC SUB-TAB -->

                <!-- Action Buttons -->
                <div class="button-group">
                    <button class="btn btn-warning" @click="$emit('save-config')" :disabled="!changes || !emontxConnected">{{ t.buttons.save }}</button>
                    <button class="btn btn-info" @click="$emit('zero-energy')" :disabled="!emontxConnected">{{ t.buttons.zeroEnergy }}</button>
                    <button class="btn btn-danger" @click="$emit('reset-defaults')" :disabled="!emontxConnected">{{ t.buttons.resetDefaults }}</button>
                    <button class="btn btn-primary" @click="$emit('load-config')" :disabled="!emontxConnected">{{ t.buttons.reloadConfig }}</button>
                    <button class="btn btn-primary" @click="$emit('generate-yaml')" :disabled="!configReceived" style="background: #9c27b0;">{{ t.buttons.generateYaml }}</button>
                </div>
            </div>
        </div>
        </form>
    `
});
