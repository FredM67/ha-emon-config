/**
 * Modal Components
 * Confirmation dialogs and other modal popups
 */

// Individual Zero Confirmation Modal
Vue.component('individual-zero-modal', {
    props: {
        show: Boolean,
        t: Object,
        target: Object  // { type: 'e' or 'p', channel: number }
    },
    computed: {
        targetLabel() {
            if (!this.target) return '';
            return this.target.type === 'e'
                ? 'E' + this.target.channel
                : 'Pulse ' + this.target.channel;
        }
    },
    template: `
        <div v-if="show" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 400px; text-align: center;">
                <h3 style="margin-top: 0; color: #f44336;">⚠️ {{ t.accumulators.confirmTitle }}</h3>
                <p style="font-size: 16px; margin: 20px 0;">
                    {{ t.accumulators.confirmMessage }}
                    <strong>{{ targetLabel }}</strong>?
                </p>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">{{ t.accumulators.confirmWarning }}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-danger" @click="$emit('confirm')" style="padding: 12px 30px; font-size: 16px;">{{ t.accumulators.confirmYes }}</button>
                    <button class="btn" @click="$emit('cancel')" style="padding: 12px 30px; font-size: 16px; background: #ccc;">{{ t.accumulators.confirmNo }}</button>
                </div>
            </div>
        </div>
    `
});

// Zero Energy Confirmation Modal (for zeroing all)
Vue.component('zero-confirm-modal', {
    props: {
        show: Boolean,
        t: Object
    },
    template: `
        <div v-if="show" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 400px; text-align: center;">
                <h3 style="margin-top: 0; color: #f44336;">⚠️ {{ t.zeroConfirm.title }}</h3>
                <p style="font-size: 16px; margin: 20px 0;">{{ t.zeroConfirm.message }}</p>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">{{ t.zeroConfirm.warning }}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-danger" @click="$emit('confirm')" style="padding: 12px 30px; font-size: 16px;">{{ t.zeroConfirm.confirm }}</button>
                    <button class="btn" @click="$emit('cancel')" style="padding: 12px 30px; font-size: 16px; background: #ccc;">{{ t.zeroConfirm.cancel }}</button>
                </div>
            </div>
        </div>
    `
});

// RF Power Warning Modal
Vue.component('rf-power-warning-modal', {
    props: {
        show: Boolean,
        t: Object,
        power: Number
    },
    template: `
        <div v-if="show" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 450px; text-align: center;">
                <h3 style="margin-top: 0; color: #ff9800;">⚠️ {{ t.rfPowerWarning.title }}</h3>
                <p style="font-size: 16px; margin: 20px 0;">{{ t.rfPowerWarning.message }} ({{ power }}).</p>
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">{{ t.rfPowerWarning.antennaWarning }}</p>
                <p style="font-size: 14px; color: #d32f2f; font-weight: bold; margin-bottom: 20px;">{{ t.rfPowerWarning.damageWarning }}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-warning" @click="$emit('confirm')" style="padding: 12px 30px; font-size: 16px;">{{ t.rfPowerWarning.confirm }}</button>
                    <button class="btn" @click="$emit('cancel')" style="padding: 12px 30px; font-size: 16px; background: #ccc;">{{ t.rfPowerWarning.cancel }}</button>
                </div>
            </div>
        </div>
    `
});

// Bulk CT Settings Modal
Vue.component('bulk-ct-modal', {
    props: {
        show: Boolean,
        t: Object,
        ichannels: Array,
        ctsAvailable: Array,
        progress: Object  // { current: number, total: number, currentCt: number, error: boolean } or null
    },
    data() {
        return {
            selectedCts: [],
            applyCtType: false,
            applyPhase: false,
            applyVchan1: false,
            applyVchan2: false,
            ctTypeValue: 20,
            ctTypeCustom: false,
            ctTypeCustomValue: 100,
            phaseValue: 0,
            vchan1Value: 1,
            vchan2Value: 1
        };
    },
    watch: {
        show(newVal) {
            if (newVal) {
                // Reset selections when modal opens
                this.selectedCts = [];
                this.applyCtType = false;
                this.applyPhase = false;
                this.applyVchan1 = false;
                this.applyVchan2 = false;
                this.ctTypeCustom = false;
            }
        },
        // Reset progress when user changes any setting after completion (allows retry)
        selectedCts() { this.resetIfComplete(); },
        applyCtType() { this.resetIfComplete(); },
        applyPhase() { this.resetIfComplete(); },
        applyVchan1() { this.resetIfComplete(); },
        applyVchan2() { this.resetIfComplete(); },
        ctTypeValue() { this.resetIfComplete(); },
        ctTypeCustomValue() { this.resetIfComplete(); },
        phaseValue() { this.resetIfComplete(); },
        vchan1Value() { this.resetIfComplete(); },
        vchan2Value() { this.resetIfComplete(); }
    },
    computed: {
        isApplying() {
            return this.progress !== null && this.progress !== undefined;
        },
        isComplete() {
            return this.progress && this.progress.current === this.progress.total;
        },
        progressPercent() {
            if (!this.progress || this.progress.total === 0) return 0;
            return Math.round((this.progress.current / this.progress.total) * 100);
        }
    },
    methods: {
        resetIfComplete() {
            // If we're in complete state (with errors), reset so user can try again
            if (this.isComplete) {
                this.$emit('reset-progress');
            }
        },
        toggleCt(idx) {
            const pos = this.selectedCts.indexOf(idx);
            if (pos === -1) {
                this.selectedCts.push(idx);
            } else {
                this.selectedCts.splice(pos, 1);
            }
        },
        selectAll() {
            this.selectedCts = this.ichannels.map((_, i) => i);
        },
        selectNone() {
            this.selectedCts = [];
        },
        selectRange(start, end) {
            this.selectedCts = [];
            for (let i = start; i <= end; i++) {
                if (i < this.ichannels.length) {
                    this.selectedCts.push(i);
                }
            }
        },
        handleCtTypeSelectChange(event) {
            const value = event.target.value;
            if (value === 'custom') {
                this.ctTypeCustom = true;
            } else {
                this.ctTypeCustom = false;
                this.ctTypeValue = parseInt(value);
            }
        },
        apply() {
            if (this.selectedCts.length === 0) return;

            const changes = {
                channels: this.selectedCts,
                values: {}
            };

            if (this.applyCtType) {
                changes.values.ical = this.ctTypeCustom ? this.ctTypeCustomValue : this.ctTypeValue;
            }
            if (this.applyPhase) {
                changes.values.ilead = parseFloat(this.phaseValue) || 0;
            }
            if (this.applyVchan1) {
                changes.values.vchan1 = parseInt(this.vchan1Value);
            }
            if (this.applyVchan2) {
                changes.values.vchan2 = parseInt(this.vchan2Value);
            }

            this.$emit('apply', changes);
        }
    },
    template: `
        <div v-if="show" class="modal-overlay">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 500px; width: 90%; max-height: 85vh; overflow-y: auto;">
                <h3 style="margin-top: 0; color: #2196F3;">{{ t.bulk.title }}</h3>

                <!-- Quick select buttons -->
                <div style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-info" @click="selectAll" style="padding: 6px 12px; font-size: 12px;">{{ t.bulk.selectAll }}</button>
                    <button class="btn btn-sm" @click="selectNone" style="padding: 6px 12px; font-size: 12px; background: #ccc;">{{ t.bulk.selectNone }}</button>
                    <button class="btn btn-sm btn-info" @click="selectRange(0, 5)" style="padding: 6px 12px; font-size: 12px;">CT 1-6</button>
                    <button class="btn btn-sm btn-info" @click="selectRange(6, 11)" style="padding: 6px 12px; font-size: 12px;">CT 7-12</button>
                </div>

                <!-- CT list with checkboxes -->
                <div style="max-height: 250px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px;">
                    <div v-for="(ch, idx) in ichannels" :key="idx"
                         @click="toggleCt(idx)"
                         :style="{
                             padding: '8px 12px',
                             cursor: 'pointer',
                             background: selectedCts.includes(idx) ? '#e3f2fd' : (idx % 2 ? '#f9f9f9' : 'white'),
                             borderBottom: idx < ichannels.length - 1 ? '1px solid #eee' : 'none',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '10px'
                         }">
                        <input type="checkbox" :checked="selectedCts.includes(idx)" @click.stop="toggleCt(idx)" style="width: 16px; height: 16px;" />
                        <span style="font-weight: 500; min-width: 45px;">CT {{ idx + 1 }}</span>
                        <span style="color: #666; font-size: 13px;">({{ ch.ical }}A, Phase: {{ ch.ilead }}, V1: {{ ch.vchan1 }}, V2: {{ ch.vchan2 }})</span>
                    </div>
                </div>

                <!-- Settings to apply -->
                <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                    <div style="font-weight: 500; margin-bottom: 10px;">{{ t.bulk.setValues }}</div>

                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <input type="checkbox" v-model="applyCtType" style="width: 16px; height: 16px;" />
                        <label style="min-width: 80px;">{{ t.config.ctType }}:</label>
                        <select :value="ctTypeCustom ? 'custom' : ctTypeValue" @change="handleCtTypeSelectChange" :disabled="!applyCtType" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <option v-for="ct in ctsAvailable" :key="ct" :value="ct">{{ ct }}A</option>
                            <option value="custom">{{ t.config.custom }}</option>
                        </select>
                        <input v-if="ctTypeCustom" type="number" min="10" max="200" v-model.number="ctTypeCustomValue" :disabled="!applyCtType" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px; width: 70px;" />
                        <span v-if="ctTypeCustom">A</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <input type="checkbox" v-model="applyPhase" style="width: 16px; height: 16px;" />
                        <label style="min-width: 80px;">{{ t.config.phase }}:</label>
                        <input type="number" step="0.01" v-model="phaseValue" :disabled="!applyPhase" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px; width: 80px;" />
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <input type="checkbox" v-model="applyVchan1" style="width: 16px; height: 16px;" />
                        <label style="min-width: 80px;">{{ t.config.vChan1 }}:</label>
                        <select v-model="vchan1Value" :disabled="!applyVchan1" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <option v-for="v in [1,2,3]" :key="v" :value="v">{{ v }}</option>
                        </select>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" v-model="applyVchan2" style="width: 16px; height: 16px;" />
                        <label style="min-width: 80px;">{{ t.config.vChan2 }}:</label>
                        <select v-model="vchan2Value" :disabled="!applyVchan2" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <option v-for="v in [1,2,3]" :key="v" :value="v">{{ v }}</option>
                        </select>
                    </div>
                </div>

                <!-- Progress bar (shown during apply) -->
                <div v-if="isApplying" style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-weight: 500;">
                            <template v-if="progress.currentCt > 0">{{ t.bulk.applying }} CT {{ progress.currentCt }}</template>
                            <template v-else-if="progress.current === progress.total && !progress.error">Done</template>
                            <template v-else-if="progress.current === progress.total && progress.error">Completed with errors</template>
                        </span>
                        <span>{{ progress.current }} / {{ progress.total }}</span>
                    </div>
                    <div style="background: #e0e0e0; border-radius: 4px; height: 20px; overflow: hidden;">
                        <div :style="{
                            width: progressPercent + '%',
                            height: '100%',
                            background: progress.error ? '#f44336' : '#4CAF50',
                            transition: 'width 0.3s ease'
                        }"></div>
                    </div>
                    <!-- Show failed channels -->
                    <div v-if="progress.failedChannels && progress.failedChannels.length > 0" style="margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;">
                        <strong>Failed:</strong> CT {{ progress.failedChannels.join(', CT ') }}
                        <div style="font-size: 12px; margin-top: 5px; color: #666;">Check values are within valid ranges (e.g., iCal: 10-200)</div>
                    </div>
                </div>

                <!-- Action buttons -->
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button v-if="!isApplying" class="btn btn-primary" @click="apply"
                            :disabled="selectedCts.length === 0 || (!applyCtType && !applyPhase && !applyVchan1 && !applyVchan2)"
                            style="padding: 12px 25px;">
                        {{ t.bulk.apply }} {{ selectedCts.length }} {{ t.bulk.selected }}
                    </button>
                    <button class="btn" @click="$emit('close')" :disabled="isApplying && !isComplete" style="padding: 12px 25px; background: #ccc;">
                        {{ isComplete ? 'Close' : t.bulk.cancel }}
                    </button>
                </div>
            </div>
        </div>
    `
});

// Temperature Slot Clear Confirmation Modal
Vue.component('temp-slot-clear-modal', {
    props: {
        show: Boolean,
        t: Object,
        slot: Number,  // null or slot number (1-8)
        clearAll: Boolean
    },
    computed: {
        title() {
            return this.clearAll
                ? this.t.tempSensors?.clearAllTitle || 'Clear All Temperature Slots'
                : this.t.tempSensors?.clearSlotTitle || 'Clear Temperature Slot';
        },
        message() {
            if (this.clearAll) {
                return this.t.tempSensors?.clearAllMessage || 'Are you sure you want to clear all temperature sensor slot assignments?';
            }
            const msg = this.t.tempSensors?.clearSlotMessage || 'Are you sure you want to clear temperature slot T{slot}?';
            return msg.replace('{slot}', this.slot);
        },
        confirmText() {
            return this.clearAll
                ? this.t.tempSensors?.confirmClearAll || 'Clear All'
                : this.t.tempSensors?.confirmClear || 'Clear Slot';
        }
    },
    template: `
        <div v-if="show" class="modal-overlay">
            <div class="modal-content">
                <h3 class="modal-title">{{ title }}</h3>
                <p style="font-size: 16px; margin: 20px 0;">{{ message }}</p>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">{{ t.tempSensors?.clearWarning || 'The sensor will be moved to the unassigned pool.' }}</p>
                <div class="modal-buttons">
                    <button class="btn btn-danger" @click="$emit('confirm')" style="padding: 12px 30px; font-size: 16px;">{{ confirmText }}</button>
                    <button class="btn" @click="$emit('cancel')" style="padding: 12px 30px; font-size: 16px; background: #ccc;">{{ t.tempSensors?.cancel || 'Cancel' }}</button>
                </div>
            </div>
        </div>
    `
});

// YAML Generator Modal
Vue.component('yaml-modal', {
    props: {
        show: Boolean,
        t: Object,
        yaml: String,
        deviceName: String
    },
    methods: {
        copyYaml(event) {
            const textarea = this.$refs.yamlTextarea;
            textarea.select();
            textarea.setSelectionRange(0, 99999); // For mobile
            try {
                document.execCommand('copy');
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = this.t.yamlModal.copied;
                setTimeout(() => { btn.textContent = originalText; }, 1500);
            } catch (err) {
                console.error('Failed to copy YAML:', err);
            }
            window.getSelection().removeAllRanges();
        },
        saveYaml() {
            const blob = new Blob([this.yaml], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (this.deviceName || 'emontx') + '-sensors.yaml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    },
    template: `
        <div v-if="show" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 600px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">
                <h3 style="margin-top: 0; color: #9c27b0;">{{ t.yamlModal.title }}</h3>
                <p style="font-size: 14px; color: #666;">{{ t.yamlModal.description }}</p>
                <textarea ref="yamlTextarea" readonly style="flex: 1; min-height: 300px; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; resize: none;">{{ yaml }}</textarea>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                    <button class="btn btn-primary" @click="copyYaml($event)" style="padding: 12px 30px; font-size: 16px; background: #9c27b0;">{{ t.yamlModal.copy }}</button>
                    <button class="btn btn-info" @click="saveYaml" style="padding: 12px 30px; font-size: 16px;">{{ t.yamlModal.save || 'Save' }}</button>
                    <button class="btn" @click="$emit('close')" style="padding: 12px 30px; font-size: 16px; background: #ccc;">{{ t.yamlModal.close }}</button>
                </div>
            </div>
        </div>
    `
});
