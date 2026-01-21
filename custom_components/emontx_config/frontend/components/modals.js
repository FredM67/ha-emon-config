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
                <h3 style="margin-top: 0; color: #f44336;">⚠️ {{ (t.accumulators && t.accumulators.confirmTitle) || 'Confirm Zero' }}</h3>
                <p style="font-size: 16px; margin: 20px 0;">
                    {{ (t.accumulators && t.accumulators.confirmMessage) || 'Are you sure you want to zero' }}
                    <strong>{{ targetLabel }}</strong>?
                </p>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">{{ (t.accumulators && t.accumulators.confirmWarning) || 'This action cannot be undone.' }}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-danger" @click="$emit('confirm')" style="padding: 12px 30px; font-size: 16px;">{{ (t.accumulators && t.accumulators.confirmYes) || 'Yes, Zero It' }}</button>
                    <button class="btn" @click="$emit('cancel')" style="padding: 12px 30px; font-size: 16px; background: #ccc;">{{ (t.accumulators && t.accumulators.confirmNo) || 'Cancel' }}</button>
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

// Bulk CT Settings Modal
Vue.component('bulk-ct-modal', {
    props: {
        show: Boolean,
        t: Object,
        ichannels: Array,
        ctsAvailable: Array
    },
    data() {
        return {
            selectedCts: [],
            applyCtType: false,
            applyPhase: false,
            applyVchan1: false,
            applyVchan2: false,
            ctTypeValue: 20,
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
            }
        }
    },
    computed: {
        bulkT() {
            return (this.t.bulk) || {};
        }
    },
    methods: {
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
        apply() {
            if (this.selectedCts.length === 0) return;

            const changes = {
                channels: this.selectedCts,
                values: {}
            };

            if (this.applyCtType) {
                changes.values.ical = this.ctTypeValue;
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
                <h3 style="margin-top: 0; color: #2196F3;">{{ bulkT.title || 'Bulk CT Settings' }}</h3>

                <!-- Quick select buttons -->
                <div style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-info" @click="selectAll" style="padding: 6px 12px; font-size: 12px;">{{ bulkT.selectAll || 'Select All' }}</button>
                    <button class="btn btn-sm" @click="selectNone" style="padding: 6px 12px; font-size: 12px; background: #ccc;">{{ bulkT.selectNone || 'Select None' }}</button>
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
                    <div style="font-weight: 500; margin-bottom: 10px;">{{ bulkT.setValues || 'Set values:' }}</div>

                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <input type="checkbox" v-model="applyCtType" style="width: 16px; height: 16px;" />
                        <label style="min-width: 80px;">{{ t.config.ctType || 'CT Type' }}:</label>
                        <select v-model="ctTypeValue" :disabled="!applyCtType" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <option v-for="ct in ctsAvailable" :key="ct" :value="ct">{{ ct }}A</option>
                        </select>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <input type="checkbox" v-model="applyPhase" style="width: 16px; height: 16px;" />
                        <label style="min-width: 80px;">{{ t.config.phase || 'Phase' }}:</label>
                        <input type="number" step="0.01" v-model="phaseValue" :disabled="!applyPhase" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px; width: 80px;" />
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <input type="checkbox" v-model="applyVchan1" style="width: 16px; height: 16px;" />
                        <label style="min-width: 80px;">{{ t.config.vChan1 || 'V Chan 1' }}:</label>
                        <select v-model="vchan1Value" :disabled="!applyVchan1" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <option v-for="v in [1,2,3]" :key="v" :value="v">{{ v }}</option>
                        </select>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" v-model="applyVchan2" style="width: 16px; height: 16px;" />
                        <label style="min-width: 80px;">{{ t.config.vChan2 || 'V Chan 2' }}:</label>
                        <select v-model="vchan2Value" :disabled="!applyVchan2" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <option v-for="v in [1,2,3]" :key="v" :value="v">{{ v }}</option>
                        </select>
                    </div>
                </div>

                <!-- Action buttons -->
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-primary" @click="apply"
                            :disabled="selectedCts.length === 0 || (!applyCtType && !applyPhase && !applyVchan1 && !applyVchan2)"
                            style="padding: 12px 25px;">
                        {{ bulkT.apply || 'Apply to' }} {{ selectedCts.length }} {{ bulkT.selected || 'selected' }}
                    </button>
                    <button class="btn" @click="$emit('close')" style="padding: 12px 25px; background: #ccc;">{{ bulkT.cancel || 'Cancel' }}</button>
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
        yaml: String
    },
    methods: {
        copyYaml() {
            navigator.clipboard.writeText(this.yaml).then(() => {
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = this.t.yamlModal.copied;
                setTimeout(() => { btn.textContent = originalText; }, 1500);
            });
        }
    },
    template: `
        <div v-if="show" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 600px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">
                <h3 style="margin-top: 0; color: #9c27b0;">{{ t.yamlModal.title }}</h3>
                <p style="font-size: 14px; color: #666;">{{ t.yamlModal.description }}</p>
                <textarea readonly style="flex: 1; min-height: 300px; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; resize: none;">{{ yaml }}</textarea>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                    <button class="btn btn-primary" @click="copyYaml" style="padding: 12px 30px; font-size: 16px; background: #9c27b0;">{{ t.yamlModal.copy }}</button>
                    <button class="btn" @click="$emit('close')" style="padding: 12px 30px; font-size: 16px; background: #ccc;">{{ t.yamlModal.close }}</button>
                </div>
            </div>
        </div>
    `
});
