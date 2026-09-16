/**
 * Lock Banner Component
 * Warning ribbon shown on every tab that can send a command the firmware
 * rejects while the device is locked (emonlock). Hidden when the device is
 * unlocked, and when the lock state is unknown (firmware without support).
 */
Vue.component('lock-banner', {
    props: {
        t: Object,
        // null = unknown (firmware without emonlock support)
        deviceLocked: { type: Boolean, default: null },
        emontxConnected: Boolean
    },
    template: `
        <div v-if="deviceLocked" class="alert alert-warning" style="display: flex; align-items: center; justify-content: space-between;">
            <span><strong>🔒 {{ t.lock.bannerTitle }}</strong> {{ t.lock.bannerMessage }}</span>
            <button type="button" class="btn btn-warning" @click="$emit('unlock-device')" :disabled="!emontxConnected" style="margin-left: 15px;">{{ t.lock.unlockButton }}</button>
        </div>
    `
});
