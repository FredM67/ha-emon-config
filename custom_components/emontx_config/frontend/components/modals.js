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
