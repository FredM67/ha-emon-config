/**
 * Config Tab Component
 * Handles device configuration with sub-tabs for calibration, sensors, and misc settings
 * Uses batch apply mode - changes are collected locally and sent on Apply
 */
Vue.component('config-tab', {
    props: {
        device: Object,
        t: Object,
        emontxConnected: Boolean,
        configReceived: Boolean,
        upgradeRequired: Boolean,
        hasUnsavedChanges: Boolean,
        hasPendingChanges: Boolean,
        pendingChangesCount: Number,
        applyProgress: Object,
        originalDevice: Object,
        changes: Boolean,
        liveData: Object,
        ctsAvailable: Array,
        failedCtIndices: Array
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
            }
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
        },
        isFieldChanged(type, index) {
            if (!this.originalDevice) return false;
            switch (type) {
                case 'vchannel':
                    // Compare only config fields (vcal, vphase, active), exclude live voltage data
                    const vc = this.device.vchannels[index];
                    const vco = this.originalDevice.vchannels[index];
                    if (!vco) return false;
                    return vc.active !== vco.active || vc.vcal !== vco.vcal || vc.vphase !== vco.vphase;
                case 'ichannel':
                    // Compare only config fields (active, ical, ilead, vchan1, vchan2), exclude live power/energy
                    const ic = this.device.ichannels[index];
                    const ico = this.originalDevice.ichannels[index];
                    if (!ico) return false;
                    return ic.active !== ico.active || ic.ical !== ico.ical || ic.ilead !== ico.ilead || ic.vchan1 !== ico.vchan1 || ic.vchan2 !== ico.vchan2;
                case 'opa':
                    return JSON.stringify(this.device.opa[index]) !== JSON.stringify(this.originalDevice.opa[index]);
                case 'radio':
                    return this.device.RF !== this.originalDevice.RF;
                case 'rfNode':
                    return this.device.rfNode !== this.originalDevice.rfNode;
                case 'rfGroup':
                    return this.device.rfGroup !== this.originalDevice.rfGroup;
                case 'rf433Toggle':
                    return this.device.rf433High !== this.originalDevice.rf433High;
                case 'rfPower':
                    return this.device.rfPower !== this.originalDevice.rfPower;
                case 'datalog':
                    return this.device.datalog !== this.originalDevice.datalog;
                case 'json':
                    return this.device.json !== this.originalDevice.json;
                default:
                    return false;
            }
        },
        isCtFailed(index) {
            return this.failedCtIndices && this.failedCtIndices.includes(index);
        }
    },
    computed: {
        applyProgressPercent() {
            if (!this.applyProgress || this.applyProgress.total === 0) return 0;
            return Math.round((this.applyProgress.current / this.applyProgress.total) * 100);
        }
    },
    template: `
        <form autocomplete="off" @submit.prevent>
        <div class="tab-content active">
            <!-- Unsaved Changes Warning Banner (for flash save) -->
            <div v-if="hasUnsavedChanges" class="alert alert-danger" style="display: flex; align-items: center; justify-content: space-between;">
                <span><strong>{{ t.unsavedChanges.title }}</strong> {{ t.unsavedChanges.message }}</span>
                <button class="btn btn-warning" @click="$emit('save-config')" style="margin-left: 15px;">{{ t.buttons.save }}</button>
            </div>

            <!-- Pending Changes Banner -->
            <div v-if="hasPendingChanges && !applyProgress" class="alert alert-warning" style="display: flex; align-items: center; justify-content: space-between;">
                <span><strong>{{ t.pendingChanges?.title || 'Pending Changes' }}</strong> {{ t.pendingChanges?.message || 'You have ' + pendingChangesCount + ' unsent change(s).' }}</span>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-success" @click="$emit('apply-changes')" :disabled="!emontxConnected">{{ t.buttons?.applyChanges || 'Apply Changes' }}</button>
                    <button class="btn" @click="$emit('discard-changes')" style="background: #ccc;">{{ t.buttons?.discardChanges || 'Discard' }}</button>
                </div>
            </div>

            <!-- Apply Progress -->
            <div v-if="applyProgress" class="alert alert-info" style="padding: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span><strong>{{ t.pendingChanges?.applying || 'Applying changes...' }}</strong> {{ applyProgress.currentItem }}</span>
                    <span>{{ applyProgress.current }} / {{ applyProgress.total }}</span>
                </div>
                <div style="background: #e0e0e0; border-radius: 4px; height: 20px; overflow: hidden;">
                    <div :style="{
                        width: applyProgressPercent + '%',
                        height: '100%',
                        background: '#4CAF50',
                        transition: 'width 0.3s ease'
                    }"></div>
                </div>
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
                    <div :class="['sub-tab', configSubTab === 'calibration' ? 'active' : '']" @click="configSubTab = 'calibration'" :title="t.tooltips.subCalibration">
                        {{ t.configTabs.calibration }}
                    </div>
                    <div :class="['sub-tab', configSubTab === 'sensors' ? 'active' : '']" @click="configSubTab = 'sensors'" :title="t.tooltips.subSensors">
                        {{ t.configTabs.sensors }}
                    </div>
                    <div :class="['sub-tab', configSubTab === 'misc' ? 'active' : '']" @click="configSubTab = 'misc'" :title="t.tooltips.subMisc">
                        {{ t.configTabs.misc }}
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
                            <input type="number" step="0.001" v-model="device.vcal" :disabled="!emontxConnected" />
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
                                    <th>{{ t.liveData?.groups?.V || 'Voltage' }}</th>
                                </tr>
                                <tr v-for="(vchannel, index) in device.vchannels" :key="'v'+index" :class="{ 'row-changed': isFieldChanged('vchannel', index) }">
                                    <td><input type="checkbox" v-model="vchannel.active" :disabled="!emontxConnected" /></td>
                                    <td>V{{ index + 1 }}</td>
                                    <td>
                                        <input type="number" step="0.001" v-model="vchannel.vcal" :disabled="!emontxConnected" />
                                        <span class="unit">%</span>
                                    </td>
                                    <td>
                                        <input type="number" step="0.01" v-model="vchannel.vphase" :disabled="!emontxConnected" />
                                        <span class="unit">&deg;</span>
                                    </td>
                                    <td>{{ vchannel.voltage || '-' }}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Current Channels -->
                <div class="card">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <span>{{ t.config.ctChannels }}</span>
                        <button v-if="device.hardware === 'emonPi3'" class="btn btn-sm btn-info" @click="$emit('open-bulk-ct')" :disabled="!emontxConnected" style="padding: 4px 12px; font-size: 12px;"
                            :title="t.bulk.tooltip">
                            {{ t.bulk.button }}
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
                                <tr v-for="(channel, index) in device.ichannels" :key="'i'+index" :class="{ 'row-changed': isFieldChanged('ichannel', index), 'row-error': isCtFailed(index) }">
                                    <td v-if="device.hardware === 'emonPi3'">
                                        <input type="checkbox" v-model="channel.active" :disabled="!emontxConnected" />
                                    </td>
                                    <td>CT {{ index + 1 }}</td>
                                    <td style="display: flex; align-items: center; gap: 5px;">
                                        <select :value="getCtSelectValue(index)" @change="handleCtTypeChange(index, $event)" :disabled="!emontxConnected">
                                            <option v-for="rating in ctsAvailable" :value="rating" :key="rating">{{ rating }}A</option>
                                            <option value="custom">{{ t.config.custom }}</option>
                                        </select>
                                        <input v-if="getCtSelectValue(index) === 'custom'"
                                               type="number" min="10" max="200"
                                               v-model.number="channel.ical"
                                               :disabled="!emontxConnected"
                                               style="width: 60px;" />
                                        <span v-if="getCtSelectValue(index) === 'custom'">A</span>
                                    </td>
                                    <td><input type="number" step="0.01" v-model.number="channel.ilead" style="width:70px" :disabled="!emontxConnected" class="no-spinner" /></td>
                                    <td v-if="device.hardware === 'emonPi3'">
                                        <select v-model="channel.vchan1" :disabled="!emontxConnected">
                                            <option v-for="v in [1,2,3]" :value="v" :key="v">{{ v }}</option>
                                        </select>
                                    </td>
                                    <td v-if="device.hardware === 'emonPi3'">
                                        <select v-model="channel.vchan2" :disabled="!emontxConnected">
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
                    <div class="card-header">{{ t.config.opaChannels }}</div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="device-info-table">
                                <tr>
                                    <th>{{ t.config.channel }}</th>
                                    <th>{{ t.config.active }}</th>
                                    <th>{{ t.config.function }}</th>
                                    <th>{{ t.config.pullUp }}</th>
                                    <th>{{ t.config.period }}</th>
                                </tr>
                                <tr v-for="(opa, idx) in device.opa" :key="'opa'+idx" :class="{ 'row-changed': isFieldChanged('opa', idx) }">
                                    <td>OPA{{ idx + 1 }}</td>
                                    <td><input type="checkbox" v-model="opa.active" :disabled="!emontxConnected" /></td>
                                    <td>
                                        <select v-model="opa.func" @change="handleOpaFuncChange(idx, $event)" :disabled="!emontxConnected">
                                            <option value="o" v-if="idx !== 2">{{ t.config.oneWire }}</option>
                                            <option value="r">{{ t.config.pulseRising }}</option>
                                            <option value="f">{{ t.config.pulseFalling }}</option>
                                            <option value="b">{{ t.config.pulseBoth }}</option>
                                        </select>
                                    </td>
                                    <td><input type="checkbox" v-model="opa.pullUp" :disabled="!emontxConnected || opa.func === 'o' || idx === 2" /></td>
                                    <td><input type="number" v-model="opa.period" :disabled="!emontxConnected || opa.func === 'o'" style="width:80px" /></td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Temperature Sensors -->
                <div class="card" v-if="device.hardware === 'emonPi3'">
                    <div class="card-header">{{ t.config.tempSensors }}</div>
                    <div class="card-body">
                        <p style="font-size: 13px; color: #666; margin-bottom: 15px;">
                            {{ t.config.tempSensorsDesc }}
                        </p>
                        <div class="button-group" style="margin-bottom: 15px;">
                            <button class="btn btn-primary" @click="$emit('scan-temp-sensors')" :disabled="!emontxConnected" :title="t.tooltips.btnScanSensors">
                                {{ t.config.scanSensors }}
                            </button>
                            <button class="btn btn-info" @click="$emit('list-temp-sensors')" :disabled="!emontxConnected" :title="t.tooltips.btnListSensors">
                                {{ t.config.listSensors }}
                            </button>
                            <button class="btn btn-warning" @click="$emit('save-temp-mapping')" :disabled="!emontxConnected || device.tempSensors.length === 0" :title="t.tooltips.btnSaveMapping">
                                {{ t.config.saveMapping }}
                            </button>
                        </div>
                        <div v-if="device.tempSensors.length > 0">
                            <table class="device-info-table">
                                <tr>
                                    <th>{{ t.config.sensor }}</th>
                                    <th>{{ t.config.address }}</th>
                                    <th>{{ t.config.temperature }}</th>
                                </tr>
                                <tr v-for="(sensor, idx) in device.tempSensors" :key="'temp'+idx">
                                    <td>T{{ idx + 1 }}</td>
                                    <td style="font-family: monospace; font-size: 12px;">{{ sensor.addr }}</td>
                                    <td>{{ liveData['T' + (idx + 1)] || '-' }}</td>
                                </tr>
                            </table>
                        </div>
                        <div v-else class="alert alert-info" style="margin: 0;">
                            {{ t.config.noTempSensors }}
                        </div>
                    </div>
                </div>

                <!-- Pulse Settings (for non-emonPi3) -->
                <div class="card" v-if="device.hardware !== 'emonPi3'">
                    <div class="card-header">{{ t.config.pulseSettings }}</div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="device-info-table">
                                <tr>
                                    <th>{{ t.config.pulseInput }}</th>
                                    <th>{{ t.config.pulsePeriod }}</th>
                                </tr>
                                <tr>
                                    <td><input type="checkbox" v-model="device.pulse" :disabled="!emontxConnected" /></td>
                                    <td><input type="number" v-model="device.pulsePeriod" :disabled="!emontxConnected" style="width:80px" /></td>
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
                        <div class="form-group" :class="{ 'field-changed': isFieldChanged('radio') }">
                            <label>{{ t.config.radioEnabled }}</label>
                            <input type="checkbox" v-model="device.RF" :disabled="!emontxConnected" />
                        </div>
                        <div class="table-responsive">
                            <table class="device-info-table">
                                <tr>
                                    <th>{{ t.config.nodeId }}</th>
                                    <th>{{ t.config.group }}</th>
                                    <th>{{ t.config.frequency }}</th>
                                    <th>{{ t.config.rfPower }}</th>
                                    <th>{{ t.config.format }}</th>
                                </tr>
                                <tr>
                                    <td :class="{ 'field-changed': isFieldChanged('rfNode') }"><input type="number" v-model="device.rfNode" :disabled="!emontxConnected" style="width:60px" /></td>
                                    <td :class="{ 'field-changed': isFieldChanged('rfGroup') }"><input type="number" v-model="device.rfGroup" :disabled="!emontxConnected" style="width:60px" /></td>
                                    <td>
                                        <span>{{ device.rfBand }}</span>
                                        <label v-if="device.rfBand && device.rfBand.includes('433')" style="margin-left: 10px; font-size: 12px;" :class="{ 'field-changed': isFieldChanged('rf433Toggle') }">
                                            <input type="checkbox" v-model="device.rf433High" :disabled="!emontxConnected" style="margin-right: 4px;" />
                                            433.92
                                        </label>
                                    </td>
                                    <td :class="{ 'field-changed': isFieldChanged('rfPower') }"><input type="number" min="0" max="31" v-model="device.rfPower" :disabled="!emontxConnected" style="width:60px" /></td>
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
                        <div class="form-group" :class="{ 'field-changed': isFieldChanged('datalog') }">
                            <label>{{ t.config.datalogInterval }}</label>
                            <input type="number" step="0.1" v-model="device.datalog" :disabled="!emontxConnected" style="width:80px" />
                            <span class="unit">s</span>
                        </div>
                        <div class="form-group" :class="{ 'field-changed': isFieldChanged('json') }">
                            <label>{{ t.config.jsonSerialFormat }}</label>
                            <input type="checkbox" v-model="device.json" :true-value="1" :false-value="0" :disabled="!emontxConnected" />
                        </div>
                    </div>
                </div>
                </div><!-- END MISC SUB-TAB -->

                <!-- Action Buttons -->
                <div class="button-group">
                    <button class="btn btn-success" @click="$emit('apply-changes')" :disabled="!hasPendingChanges || !emontxConnected || applyProgress" :title="t.tooltips?.btnApplyChanges || 'Send pending changes to device'">
                        {{ t.buttons?.applyChanges || 'Apply Changes' }} <span v-if="pendingChangesCount > 0">({{ pendingChangesCount }})</span>
                    </button>
                    <button class="btn" @click="$emit('discard-changes')" :disabled="!hasPendingChanges || applyProgress" style="background: #ccc;" :title="t.tooltips?.btnDiscardChanges || 'Discard pending changes'">
                        {{ t.buttons?.discardChanges || 'Discard' }}
                    </button>
                    <button class="btn btn-warning" @click="$emit('save-config')" :disabled="!changes || !emontxConnected" :title="t.tooltips.btnSave">{{ t.buttons.save }}</button>
                    <button class="btn btn-info" @click="$emit('zero-energy')" :disabled="!emontxConnected" :title="t.tooltips.btnZeroEnergy">{{ t.buttons.zeroEnergy }}</button>
                    <button class="btn btn-danger" @click="$emit('reset-defaults')" :disabled="!emontxConnected" :title="t.tooltips.btnResetDefaults">{{ t.buttons.resetDefaults }}</button>
                    <button class="btn btn-primary" @click="$emit('load-config')" :disabled="!emontxConnected" :title="t.tooltips.btnReloadConfig">{{ t.buttons.reloadConfig }}</button>
                    <button class="btn btn-primary" @click="$emit('generate-yaml')" :disabled="!configReceived" style="background: #9c27b0;" :title="t.tooltips.btnGenerateYaml">{{ t.buttons.generateYaml }}</button>
                </div>
            </div>
        </div>
        </form>
    `
});
