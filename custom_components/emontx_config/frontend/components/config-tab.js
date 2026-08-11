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
        failedCtIndices: { type: Array, default: () => [] },
        failedCtFields: { type: Array, default: () => [] },
        failedCtMessages: { type: Object, default: () => ({}) },
        failedVcalIndices: { type: Array, default: () => [] },
        failedVcalMessages: { type: Object, default: () => ({}) },
        failedOpaIndices: { type: Array, default: () => [] },
        failedOpaMessages: { type: Object, default: () => ({}) },
        channelNames: { type: Object, default: () => ({ ct: {}, voltage: {}, opa: {}, temp: {} }) },
        tempScanLoading: { type: Boolean, default: false },
        noResponse: { type: Boolean, default: false }
    },
    data() {
        return {
            configSubTab: (window.parent.localStorage || localStorage).getItem('emontx_config_subtab') || 'calibration',
            customCtChannels: {}  // Track which channels are using custom CT values
        };
    },
    watch: {
        configSubTab(newTab) {
            (window.parent.localStorage || localStorage).setItem('emontx_config_subtab', newTab);
        }
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
                this.device.ichannels[index].ical = parseFloat(value);
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
        applyOpaPreset(idx, preset) {
            const opa = this.device.opa[idx];
            if (preset === 'oem-pulse') {
                opa.active = true;
                opa.func = 'r';  // Rising edge
                opa.pullUp = false;
                opa.period = 25;
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
                case 'serial':
                    return this.device.serial !== this.originalDevice.serial;
                default:
                    return false;
            }
        },
        isCtFailed(index) {
            return this.failedCtIndices && this.failedCtIndices.includes(index);
        },
        isFieldError(index, field) {
            // Check if this specific field on this CT should be highlighted as error
            // Must be: CT failed AND field was in the applied set AND field was actually changed
            if (!this.isCtFailed(index)) return false;
            if (!this.failedCtFields || !this.failedCtFields.includes(field)) return false;
            if (!this.originalDevice || !this.originalDevice.ichannels || !this.originalDevice.ichannels[index]) return false;
            const curr = this.device.ichannels[index];
            const orig = this.originalDevice.ichannels[index];
            // Check if this specific field differs from original
            return curr[field] !== orig[field];
        },
        isVcalFailed(index) {
            return this.failedVcalIndices && this.failedVcalIndices.includes(index);
        },
        isOpaFailed(index) {
            return this.failedOpaIndices && this.failedOpaIndices.includes(index);
        },
        isVcalFieldError(index, field) {
            // Only show error if this vchannel failed AND this specific field was changed
            if (!this.isVcalFailed(index)) return false;
            if (!this.originalDevice || !this.originalDevice.vchannels || !this.originalDevice.vchannels[index]) return false;
            const curr = this.device.vchannels[index];
            const orig = this.originalDevice.vchannels[index];
            // Check if this specific field differs from original
            return curr[field] !== orig[field];
        },
        formatVoltage(voltage) {
            if (!voltage) return '-';
            // Remove 'V' suffix if present and parse as float
            const val = parseFloat(voltage.toString().replace('V', '').trim());
            return isNaN(val) ? '-' : val.toFixed(2) + ' V';
        },
        getChannelName(type, key) {
            return (this.channelNames[type] && this.channelNames[type][key]) || '';
        },
        onNameChange(type, key, event) {
            this.$emit('update-channel-name', type, key, event.target.value);
        },
        handleImportFile(event) {
            const file = event.target.files[0];
            if (file) {
                this.$emit('import-names', file);
                event.target.value = '';  // Reset input so same file can be selected again
            }
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
        <div class="tab-content active" :style="{ paddingBottom: (hasPendingChanges || applyProgress) ? '68px' : '0' }">
            <!-- Unsaved Changes Warning Banner (for flash save) -->
            <div v-if="hasUnsavedChanges" class="alert alert-danger" style="display: flex; align-items: center; justify-content: space-between;">
                <span><strong>{{ t.unsavedChanges.title }}</strong> {{ t.unsavedChanges.message }}</span>
                <button type="button" class="btn btn-warning" @click="$emit('save-config')" style="margin-left: 15px;">{{ t.buttons.save }}</button>
            </div>

            <!-- Floating Bottom Bar for Pending Changes / Apply Progress -->
            <div v-if="hasPendingChanges || applyProgress" class="floating-bottom-bar">
                <!-- Pending Changes State -->
                <template v-if="!applyProgress">
                    <div class="floating-bar-content">
                        <span class="floating-bar-badge">{{ pendingChangesCount }}</span>
                        <span class="floating-bar-text">{{ t.pendingChanges.title }}</span>
                    </div>
                    <div class="floating-bar-buttons">
                        <button type="button" class="btn btn-success" @click="$emit('apply-changes')" :disabled="!emontxConnected">{{ t.buttons.applyChanges }}</button>
                        <button type="button" class="btn" @click="$emit('discard-changes')" style="background: #ccc;">{{ t.buttons.discardChanges }}</button>
                    </div>
                </template>
                <!-- Apply Progress State -->
                <template v-else>
                    <div class="floating-bar-content" style="flex: 1;">
                        <span class="floating-bar-text"><strong>{{ t.pendingChanges.applying }}</strong> {{ applyProgress.currentItem }}</span>
                        <span style="margin-left: auto;">{{ applyProgress.current }} / {{ applyProgress.total }}</span>
                    </div>
                    <div style="flex: 2; margin-left: 15px;">
                        <div style="background: rgba(255,255,255,0.3); border-radius: 4px; height: 12px; overflow: hidden;">
                            <div :style="{
                                width: applyProgressPercent + '%',
                                height: '100%',
                                background: '#fff',
                                transition: 'width 0.3s ease'
                            }"></div>
                        </div>
                    </div>
                </template>
            </div>

            <div v-if="!configReceived && !noResponse" class="alert alert-info">
                <span v-if="emontxConnected" class="spinner-dark"></span>
                {{ t.config.waiting }} {{ t.config.clickLoad }}
                <button type="button" class="btn btn-primary" style="margin-left: 15px;" @click="$emit('load-config')" :disabled="!emontxConnected">{{ t.buttons.loadConfig }}</button>
            </div>

            <div v-if="!configReceived && noResponse" class="alert alert-danger">
                {{ t.config.noResponseWarning }}
                <button type="button" class="btn btn-primary" style="margin-left: 15px;" @click="$emit('load-config')" :disabled="!emontxConnected">{{ t.buttons.loadConfig }}</button>
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
                    <a href="https://docs.openenergymonitor.org/" target="_blank" class="sub-tab-link" :title="t.config.documentation">
                        {{ t.config.documentation }} ↗
                    </a>
                </div>

                <!-- CALIBRATION SUB-TAB -->
                <div v-show="configSubTab === 'calibration'">

                <div class="card calibration-card">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <span>{{ t.autoCalibration.title }}</span>
                        <button type="button" class="btn btn-sm btn-primary" @click="$emit('open-auto-calibration')" :disabled="!emontxConnected">
                            {{ t.autoCalibration.open }}
                        </button>
                    </div>
                    <div class="card-body calibration-card-body">
                        {{ t.autoCalibration.description }}
                    </div>
                </div>

                <!-- Voltage Calibration (non-emonPi3) -->
                <div class="card" v-if="device.hardware !== 'emonPi3'">
                    <div class="card-header">{{ t.config.voltageCalibration }}</div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>{{ t.config.vCal }}</label>
                            <input type="number" step="0.01" v-model="device.vcal" :disabled="!emontxConnected" />
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
                                    <th>{{ t.config.name }}</th>
                                    <th>{{ t.config.calibration }}</th>
                                    <th>{{ t.config.phase }}</th>
                                    <th>{{ t.liveData.groups.V }}</th>
                                </tr>
                                <tr v-for="(vchannel, index) in device.vchannels" :key="'v'+index" :class="{ 'row-changed': isFieldChanged('vchannel', index), 'row-error': isVcalFailed(index) }">
                                    <td><input type="checkbox" v-model="vchannel.active" :disabled="!emontxConnected" /></td>
                                    <td>V{{ index + 1 }}</td>
                                    <td><input type="text" :value="getChannelName('voltage', String(index + 1))" @input="onNameChange('voltage', String(index + 1), $event)" :placeholder="t.config.namePlaceholder" style="width: 150px;" /></td>
                                    <td>
                                        <input type="number" step="0.01" v-model="vchannel.vcal" :disabled="!emontxConnected" :class="{ 'input-error': isVcalFieldError(index, 'vcal') }" :title="failedVcalMessages[index] || undefined" />
                                        <span class="unit">%</span>
                                        <div v-if="isVcalFailed(index) && failedVcalMessages[index]" class="field-error-msg">{{ failedVcalMessages[index] }}</div>
                                    </td>
                                    <td>
                                        <input type="number" step="0.01" v-model="vchannel.vphase" :disabled="!emontxConnected" :class="{ 'input-error': isVcalFieldError(index, 'vphase') }" />
                                        <span class="unit">&deg;</span>
                                    </td>
                                    <td>{{ formatVoltage(vchannel.voltage) }}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Current Channels -->
                <div class="card">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <span>{{ t.config.ctChannels }}</span>
                        <button v-if="device.hardware === 'emonPi3'" type="button" class="btn btn-sm btn-info" @click="$emit('open-bulk-ct')" :disabled="!emontxConnected" style="padding: 4px 12px; font-size: 12px;"
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
                                    <th>{{ t.config.name }}</th>
                                    <th>{{ t.config.ctType }}</th>
                                    <th>{{ t.config.phase }}</th>
                                    <th v-if="device.hardware === 'emonPi3'">{{ t.config.vChan1 }}</th>
                                    <th v-if="device.hardware === 'emonPi3'">{{ t.config.vChan2 }}</th>
                                </tr>
                                <tr v-for="(channel, index) in device.ichannels" :key="'i'+index" :class="{ 'row-changed': isFieldChanged('ichannel', index), 'row-error': isCtFailed(index) }">
                                    <td v-if="device.hardware === 'emonPi3'">
                                        <input type="checkbox" v-model="channel.active" :disabled="!emontxConnected" />
                                    </td>
                                    <td>CT {{ index + 1 }}</td>
                                    <td><input type="text" :value="getChannelName('ct', String(index + 1))" @input="onNameChange('ct', String(index + 1), $event)" :placeholder="t.config.namePlaceholder" style="width: 150px;" /></td>
                                    <td>
                                        <div style="display: flex; align-items: flex-start; gap: 5px;">
                                            <select :value="getCtSelectValue(index)" @change="handleCtTypeChange(index, $event)" :disabled="!emontxConnected" :class="{ 'input-error': isFieldError(index, 'ical') }">
                                                <option v-for="rating in ctsAvailable" :value="rating" :key="rating">{{ rating }}A</option>
                                                <option value="custom">{{ t.config.custom }}</option>
                                            </select>
                                            <div v-if="getCtSelectValue(index) === 'custom'">
                                                <div style="display: flex; align-items: center; gap: 3px;">
                                                    <input type="number" min="10" max="200" step="0.01"
                                                           v-model.number="channel.ical"
                                                           :disabled="!emontxConnected"
                                                           :class="{ 'input-error': isFieldError(index, 'ical') }"
                                                           :title="failedCtMessages[index] || undefined"
                                                           style="width: 100px;" />
                                                    <span>A</span>
                                                </div>
                                                <div v-if="isCtFailed(index) && failedCtMessages[index]" class="field-error-msg">{{ failedCtMessages[index] }}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><input type="number" step="0.01" v-model.number="channel.ilead" style="width:70px" :disabled="!emontxConnected" :class="{ 'input-error': isFieldError(index, 'ilead') }" class="no-spinner" /><span class="unit">&deg;</span></td>
                                    <td v-if="device.hardware === 'emonPi3'">
                                        <select v-model="channel.vchan1" :disabled="!emontxConnected" :class="{ 'input-error': isFieldError(index, 'vchan1') }">
                                            <option v-for="v in [1,2,3]" :value="v" :key="v">{{ v }}</option>
                                        </select>
                                    </td>
                                    <td v-if="device.hardware === 'emonPi3'">
                                        <select v-model="channel.vchan2" :disabled="!emontxConnected" :class="{ 'input-error': isFieldError(index, 'vchan2') }">
                                            <option v-for="v in [1,2,3]" :value="v" :key="v">{{ v }}</option>
                                        </select>
                                    </td>
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
                                    <th>{{ t.config.name }}</th>
                                    <th>{{ t.config.active }}</th>
                                    <th>{{ t.config.function }}</th>
                                    <th>{{ t.config.pullUp }}</th>
                                    <th>{{ t.config.period }}</th>
                                    <th>{{ t.config.preset }}</th>
                                </tr>
                                <tr v-for="(opa, idx) in device.opa" :key="'opa'+idx" :class="{ 'row-changed': isFieldChanged('opa', idx), 'row-error': isOpaFailed(idx) }">
                                    <td>OPA{{ idx + 1 }}</td>
                                    <td>
                                        <input v-if="opa.func !== 'o'" type="text" :value="getChannelName('opa', String(idx + 1))" @input="onNameChange('opa', String(idx + 1), $event)" :placeholder="t.config.namePlaceholder" style="width: 120px;" />
                                        <span v-else style="color: #999; font-size: 12px;">-</span>
                                    </td>
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
                                    <td>
                                        <input type="number" v-model="opa.period" :disabled="!emontxConnected || opa.func === 'o'" :class="{ 'input-error': isOpaFailed(idx) }" :title="failedOpaMessages[idx] || undefined" style="width:80px" />
                                        <div v-if="isOpaFailed(idx) && failedOpaMessages[idx]" class="field-error-msg">{{ failedOpaMessages[idx] }}</div>
                                    </td>
                                    <td>
                                        <button type="button" class="btn btn-sm" @click="applyOpaPreset(idx, 'oem-pulse')" :disabled="!emontxConnected" style="padding: 4px 8px; font-size: 12px;">
                                            {{ t.config.oemPulseSensor }}
                                        </button>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Temperature Sensors -->
                <temp-sensors-section
                    v-if="device.hardware === 'emonPi3'"
                    :device="device"
                    :original-device="originalDevice"
                    :t="t"
                    :emontx-connected="emontxConnected"
                    :temp-scan-loading="tempScanLoading"
                    :live-data="liveData"
                    :channel-names="channelNames"
                    @scan-temp-sensors="$emit('scan-temp-sensors')"
                    @list-temp-sensors="$emit('list-temp-sensors')"
                    @list-saved-temp-sensors="$emit('list-saved-temp-sensors')"
                    @assign-temp-slot="(slot, addr) => $emit('assign-temp-slot', slot, addr)"
                    @save-temp-mapping="$emit('save-temp-mapping')"
                    @clear-temp-slot="(slot) => $emit('clear-temp-slot', slot)"
                    @clear-all-temp-slots="$emit('clear-all-temp-slots')"
                    @update-channel-name="(type, key, value) => $emit('update-channel-name', type, key, value)"
                ></temp-sensors-section>

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
                                        <span v-if="!device.rfBand || !device.rfBand.includes('433')">{{ device.rfBand }}</span>
                                        <span v-else>433 MHz</span>
                                        <label v-if="device.rfBand && device.rfBand.includes('433')" style="margin-left: 10px; font-size: 12px;" :class="{ 'field-changed': isFieldChanged('rf433Toggle') }">
                                            <input type="checkbox" v-model="device.rf433High" :disabled="!emontxConnected" style="margin-right: 4px;" />
                                            {{ t.config.compatMode }}
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
                        <div class="form-group" :class="{ 'field-changed': isFieldChanged('serial') }">
                            <label>{{ t.config.serialOutput }}</label>
                            <div>
                                <div class="view-mode-toggle" style="display: inline-flex;">
                                    <label :class="{ active: device.serial === 'off' }">
                                        <input type="radio" value="off" v-model="device.serial" :disabled="!emontxConnected" />
                                        {{ t.config.serialOff }}
                                    </label>
                                    <label :class="{ active: device.serial === 'normal' }">
                                        <input type="radio" value="normal" v-model="device.serial" :disabled="!emontxConnected" />
                                        {{ t.config.serialNormal }}
                                    </label>
                                    <label :class="{ active: device.serial === 'verbose' }">
                                        <input type="radio" value="verbose" v-model="device.serial" :disabled="!emontxConnected" />
                                        {{ t.config.serialVerbose }}
                                    </label>
                                </div>
                                <small v-if="device.serial" style="display: block; margin-top: 4px; color: #666;">
                                    <span v-if="device.serial === 'off'">{{ t.config.serialDescOff }}</span>
                                    <span v-else-if="device.serial === 'normal'">{{ t.config.serialDescNormal }}</span>
                                    <span v-else>{{ t.config.serialDescVerbose }}</span>
                                </small>
                            </div>
                        </div>
                        <div class="form-group" :class="{ 'field-changed': isFieldChanged('datalog') }">
                            <label>{{ t.config.datalogInterval }}</label>
                            <input type="number" step="0.1" v-model="device.datalog" :disabled="!emontxConnected || device.serial === 'off'" style="width:80px" />
                            <span class="unit">s</span>
                        </div>
                        <div class="form-group" :class="{ 'field-changed': isFieldChanged('json') }">
                            <label>{{ t.config.jsonSerialFormat }}</label>
                            <input type="checkbox" v-model="device.json" :true-value="1" :false-value="0" :disabled="!emontxConnected || device.serial === 'off'" />
                        </div>
                    </div>
                </div>
                <!-- Channel Names Backup -->
                <div class="card">
                    <div class="card-header">{{ t.config.channelNamesBackup }}</div>
                    <div class="card-body">
                        <p style="font-size: 13px; color: #666; margin-bottom: 15px;">
                            {{ t.config.channelNamesBackupDesc }}
                        </p>
                        <div class="button-group">
                            <button type="button" class="btn btn-info" @click="$emit('export-names')" :title="t.tooltips.btnExportNames">
                                {{ t.buttons.exportNames }}
                            </button>
                            <label class="btn btn-primary" style="margin: 0; cursor: pointer;" :title="t.tooltips.btnImportNames">
                                {{ t.buttons.importNames }}
                                <input type="file" accept=".json" @change="handleImportFile" style="display: none;" />
                            </label>
                        </div>
                    </div>
                </div>

                </div><!-- END MISC SUB-TAB -->

                <!-- Action Buttons -->
                <div class="button-group">
                    <button type="button" class="btn btn-success" @click="$emit('apply-changes')" :disabled="!hasPendingChanges || !emontxConnected || applyProgress" :title="t.tooltips.btnApplyChanges">
                        {{ t.buttons.applyChanges }} <span v-if="pendingChangesCount > 0">({{ pendingChangesCount }})</span>
                    </button>
                    <button type="button" class="btn" @click="$emit('discard-changes')" :disabled="!hasPendingChanges || applyProgress" style="background: #ccc;" :title="t.tooltips.btnDiscardChanges">
                        {{ t.buttons.discardChanges }}
                    </button>
                    <button type="button" class="btn btn-warning" @click="$emit('save-config')" :disabled="!hasUnsavedChanges || !emontxConnected" :title="t.tooltips.btnSave">{{ t.buttons.save }}</button>
                    <button type="button" class="btn btn-info" @click="$emit('restore-saved')" :disabled="!emontxConnected" :title="t.tooltips.btnRestoreSaved">{{ t.buttons.restoreSaved }}</button>
                    <button type="button" class="btn btn-danger" @click="$emit('reset-defaults')" :disabled="!emontxConnected" :title="t.tooltips.btnResetDefaults">{{ t.buttons.resetDefaults }}</button>
                    <button type="button" class="btn btn-primary" @click="$emit('load-config')" :disabled="!emontxConnected" :title="t.tooltips.btnReloadConfig">{{ t.buttons.reloadConfig }}</button>
                    <button type="button" class="btn" @click="$emit('reboot-device')" :disabled="!emontxConnected" style="background: #ff5722; color: white;" :title="t.tooltips.btnReboot">{{ t.buttons.reboot }}</button>
                    <button type="button" class="btn btn-primary" @click="$emit('generate-yaml')" :disabled="!configReceived" style="background: #9c27b0;" :title="t.tooltips.btnGenerateYaml">{{ t.buttons.generateYaml }}</button>
                </div>
            </div>
        </div>
        </form>
    `
});
