/**
 * Firmware Tab Component
 * OTA firmware update management for emonTx6 / emonPi3
 */
Vue.component('firmware-tab', {
    props: {
        t: Object,
        device: Object,
        firmwareCheckFrequency: { type: String, default: 'weekly' },
        firmwareUpdateAvailable: { type: Boolean, default: false },
        latestFirmwareVersion: { type: String, default: null },
        latestFirmwareBinUrl: { type: String, default: null },
        checkingFirmware: { type: Boolean, default: false },
        flashingFirmware: { type: Boolean, default: false },
        flashStatus: { type: String, default: null },
        flashProgress: { type: Number, default: 0 }
    },
    template: `
        <div style="padding: 20px;">
            <div class="card">
                <div class="card-header">{{ t.config.firmwareUpdate }}</div>
                <div class="card-body">
                    <div class="form-group">
                        <label>{{ t.config.updateCheckFrequency }}</label>
                        <select v-model="firmwareCheckFrequency" @change="$emit('update-firmware-frequency', firmwareCheckFrequency)" style="width: 120px;">
                            <option value="never">{{ t.config.updateFreqNever }}</option>
                            <option value="daily">{{ t.config.updateFreqDaily }}</option>
                            <option value="weekly">{{ t.config.updateFreqWeekly }}</option>
                            <option value="monthly">{{ t.config.updateFreqMonthly }}</option>
                        </select>
                    </div>
                    <div class="form-group" style="display: flex; align-items: center; gap: 15px;">
                        <button type="button" class="btn btn-info" @click="$emit('check-firmware-now')" :disabled="checkingFirmware || flashingFirmware">
                            {{ checkingFirmware ? t.config.checking : t.config.checkNow }}
                        </button>
                        <span v-if="firmwareUpdateAvailable" style="color: #4CAF50; font-weight: bold;">
                            {{ t.config.updateAvailable }} ({{ latestFirmwareVersion }})
                        </span>
                        <span v-else-if="latestFirmwareVersion" style="color: #666;">
                            {{ t.config.upToDate }}
                        </span>
                    </div>
                    <!-- UART bootloader prerequisite notice (emonTx6 and emonPi3 share the same hw/fw) -->
                    <template v-if="device.hardware === 'emonTx6' || device.hardware === 'emonPi3'">
                        <!-- UF2/USB bootloader detected (or unknown): setup required -->
                        <div v-if="device.bootloader !== 'uart'"
                             style="border-top: 1px solid #eee; padding-top: 12px; margin-top: 4px;
                                    background: #fff8e1; border: 1px solid #ffe082; border-radius: 4px; padding: 10px 14px;">
                            <strong style="color: #e65100;">&#9888; {{ t.config.uartBootloaderTitle }}</strong>
                            <p style="margin: 6px 0 0; font-size: 13px; color: #555;">
                                {{ t.config.uartBootloaderNote }}
                            </p>
                            <p style="margin: 6px 0 0; font-size: 13px;">
                                <a href="https://docs.openenergymonitor.org/emonpi3/firmware.html#changing-the-bootloader"
                                   target="_blank" rel="noopener noreferrer">
                                    {{ t.config.uartBootloaderDocLink }}
                                </a>
                            </p>
                        </div>
                        <!-- UART bootloader detected: ready for OTA -->
                        <div v-else
                             style="border-top: 1px solid #eee; padding-top: 12px; margin-top: 4px;
                                    background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 4px; padding: 10px 14px;">
                            <strong style="color: #2e7d32;">&#10003; {{ t.config.uartBootloaderReady }}</strong>
                        </div>
                    </template>
                    <!-- Flash firmware section — shown whenever a .bin URL is known -->
                    <div v-if="latestFirmwareBinUrl"
                         style="border-top: 1px solid #eee; padding-top: 12px; margin-top: 4px;">
                        <div v-if="!flashingFirmware">
                            <button type="button" class="btn btn-warning" @click="$emit('flash-firmware')"
                                    :disabled="!firmwareUpdateAvailable || ((device.hardware === 'emonTx6' || device.hardware === 'emonPi3') && device.bootloader !== 'uart')"
                                    style="margin-right: 10px;">
                                {{ t.config.flashFirmware }}
                            </button>
                            <span style="font-size: 12px; color: #888; margin-right: 10px;">
                                {{ t.config.flashFirmwareDesc }}
                            </span>
                        </div>
                        <div v-else>
                            <div style="margin-bottom: 6px; font-weight: bold;">
                                {{ t.config.flashingFirmware }} {{ flashProgress }}%
                            </div>
                            <div style="background: #ddd; border-radius: 4px; height: 10px; overflow: hidden; width: 220px;">
                                <div :style="{ width: flashProgress + '%', background: flashStatus === 'failed' ? '#e53935' : '#4CAF50', height: '100%', transition: 'width 0.5s' }"></div>
                            </div>
                            <div style="font-size: 12px; color: #666; margin-top: 5px;">
                                <span v-if="flashStatus === 'complete'" style="color: #4CAF50; font-weight: bold;">{{ t.config.flashComplete }}</span>
                                <span v-else-if="flashStatus === 'failed'" style="color: #e53935; font-weight: bold;">{{ t.config.flashFailed }}</span>
                                <span v-else>{{ t.config.flashingFirmware }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
});
