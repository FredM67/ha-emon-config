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
        firmwareReleases: { type: Array, default: () => [] },
        selectedFirmwareVersion: { type: String, default: null },
        advancedFirmwareMode: { type: Boolean, default: false },
        firmwareRepo: { type: String, default: 'openenergymonitor/emon32-fw' },
        firmwareDirectUrl: { type: String, default: '' },
        flashServiceAvailable: { type: Boolean, default: false },
        checkingFirmware: { type: Boolean, default: false },
        flashingFirmware: { type: Boolean, default: false },
        flashStatus: { type: String, default: null },
        flashProgress: { type: Number, default: 0 }
    },
    data() {
        return {
            confirmSwitchUsb: false
        };
    },
    computed: {
        effectiveVersion() {
            if (this.advancedFirmwareMode && this.selectedFirmwareVersion) {
                return this.selectedFirmwareVersion;
            }
            return this.latestFirmwareVersion;
        },
        effectiveBinUrl() {
            if (this.advancedFirmwareMode) {
                if (this.firmwareDirectUrl && this.firmwareDirectUrl.trim()) {
                    return this.firmwareDirectUrl.trim();
                }
                if (this.selectedFirmwareVersion) {
                    const rel = this.firmwareReleases.find(r => r.version === this.selectedFirmwareVersion);
                    return rel ? rel.binUrl : null;
                }
            }
            return this.latestFirmwareBinUrl;
        },
        canFlash() {
            if (!this.flashServiceAvailable) return false;
            const hasUrl = !!this.effectiveBinUrl;
            const bootloaderOk = !(
                (this.device.hardware === 'emonTx6' || this.device.hardware === 'emonPi3') &&
                this.device.bootloader !== 'uart'
            );
            if (this.advancedFirmwareMode) return hasUrl && bootloaderOk;
            return this.firmwareUpdateAvailable && hasUrl && bootloaderOk;
        },
        releasesNewestFirst() {
            return this.firmwareReleases.slice();
        },
        usingDirectUrl() {
            return this.advancedFirmwareMode && this.firmwareDirectUrl && this.firmwareDirectUrl.trim();
        }
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
                        <div v-if="device.bootloader !== 'uart'"
                             style="background: #fff8e1; border: 1px solid #ffe082; border-radius: 4px; padding: 10px 14px; margin-top: 4px;">
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
                        <div v-else
                             style="background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 4px; padding: 10px 14px; margin-top: 4px;">
                            <strong style="color: #2e7d32;">&#10003; {{ t.config.uartBootloaderReady }}</strong>
                        </div>
                    </template>
                    <!-- emontx_updater service missing notice -->
                    <div v-if="!flashServiceAvailable"
                         style="background: #fff8e1; border: 1px solid #ffe082; border-radius: 4px; padding: 10px 14px; margin-top: 8px;">
                        <strong style="color: #e65100;">&#9888; {{ t.config.flashServiceMissing }}</strong>
                        <p style="margin: 6px 0 0; font-size: 13px; color: #555;">
                            {{ t.config.flashServiceMissingNote }}
                        </p>
                    </div>

                    <!-- Flash firmware section -->
                    <div style="border-top: 1px solid #eee; padding-top: 12px; margin-top: 12px;">
                        <div v-if="!flashingFirmware">
                            <!-- Advanced Mode toggle -->
                            <div style="margin-bottom: 10px;">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; font-size: 13px; color: #555;">
                                    <input type="checkbox"
                                           :checked="advancedFirmwareMode"
                                           @change="$emit('update:advanced-firmware-mode', $event.target.checked)"
                                           style="cursor: pointer;">
                                    {{ t.config.advancedMode }}
                                </label>
                            </div>

                            <!-- Advanced mode controls -->
                            <div v-if="advancedFirmwareMode"
                                 style="background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; padding: 12px; margin-bottom: 10px;">

                                <!-- Custom GitHub repo -->
                                <div class="form-group" style="margin-bottom: 10px;">
                                    <label style="font-size: 13px; display: block; margin-bottom: 4px;">{{ t.config.firmwareRepo }}</label>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <input type="text"
                                               :value="firmwareRepo"
                                               @input="$emit('update:firmware-repo', $event.target.value)"
                                               placeholder="owner/repo"
                                               style="width: 260px; font-family: monospace; font-size: 13px;">
                                        <button type="button" class="btn btn-info btn-sm"
                                                @click="$emit('check-firmware-now')"
                                                :disabled="checkingFirmware || flashingFirmware"
                                                style="font-size: 12px; padding: 3px 10px;">
                                            {{ checkingFirmware ? t.config.checking : t.config.checkNow }}
                                        </button>
                                    </div>
                                </div>

                                <!-- Version selector (disabled when direct URL is set) -->
                                <div v-if="releasesNewestFirst.length > 0"
                                     class="form-group" style="margin-bottom: 10px;">
                                    <label style="font-size: 13px; display: block; margin-bottom: 4px;">{{ t.config.firmwareVersion }}</label>
                                    <select :value="selectedFirmwareVersion || latestFirmwareVersion"
                                            @change="$emit('update:selected-firmware-version', $event.target.value)"
                                            :disabled="!!usingDirectUrl"
                                            style="width: 160px;">
                                        <option v-for="rel in releasesNewestFirst" :key="rel.version" :value="rel.version">
                                            {{ rel.version }}{{ rel.version === latestFirmwareVersion ? ' (' + t.config.latest + ')' : '' }}
                                        </option>
                                    </select>
                                </div>

                                <!-- Direct .bin URL override -->
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label style="font-size: 13px; display: block; margin-bottom: 4px;">{{ t.config.firmwareDirectUrl }}</label>
                                    <input type="text"
                                           :value="firmwareDirectUrl"
                                           @input="$emit('update:firmware-direct-url', $event.target.value)"
                                           :placeholder="t.config.firmwareDirectUrlPlaceholder"
                                           style="width: 100%; font-family: monospace; font-size: 12px;">
                                    <span v-if="usingDirectUrl" style="font-size: 11px; color: #e65100;">
                                        &#9888; {{ t.config.firmwareDirectUrlOverride }}
                                    </span>
                                </div>
                            </div>

                            <!-- Flash button -->
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <button type="button" class="btn btn-warning" @click="$emit('flash-firmware')"
                                        :disabled="!canFlash">
                                    {{ t.config.flashFirmware }}
                                </button>
                                <span style="font-size: 12px; color: #888;">
                                    <template v-if="usingDirectUrl">{{ t.config.firmwareDirectUrlActive }}</template>
                                    <template v-else-if="advancedFirmwareMode && effectiveVersion">v{{ effectiveVersion }}</template>
                                    <template v-else>{{ t.config.flashFirmwareDesc }}</template>
                                </span>
                            </div>
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

            <!-- Bootloader section — only shown for emonTx6/emonPi3 with UART bootloader active -->
            <template v-if="(device.hardware === 'emonTx6' || device.hardware === 'emonPi3') && device.bootloader === 'uart'">
                <div class="card" style="margin-top: 16px;">
                    <div class="card-header">{{ t.config.bootloaderSection }}</div>
                    <div class="card-body">
                        <div v-if="!flashingFirmware">
                            <div v-if="!confirmSwitchUsb">
                                <button type="button"
                                        class="btn"
                                        @click="confirmSwitchUsb = true"
                                        style="background: #c62828; color: #fff; border: none;">
                                    {{ t.config.switchToUsbBootloader }}
                                </button>
                                <span style="font-size: 12px; color: #888; margin-left: 10px;">
                                    {{ t.config.switchToUsbBootloaderDesc }}
                                </span>
                            </div>
                            <div v-else
                                 style="background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px; padding: 12px;">
                                <strong style="color: #c62828;">&#9888; {{ t.config.switchToUsbConfirmTitle }}</strong>
                                <p style="margin: 6px 0 10px; font-size: 13px; color: #555;">
                                    {{ t.config.switchToUsbConfirmNote }}
                                </p>
                                <div style="display: flex; gap: 10px;">
                                    <button type="button"
                                            class="btn"
                                            @click="$emit('switch-to-usb-bootloader'); confirmSwitchUsb = false"
                                            style="background: #c62828; color: #fff; border: none;">
                                        {{ t.config.switchToUsbConfirm }}
                                    </button>
                                    <button type="button" class="btn btn-default" @click="confirmSwitchUsb = false">
                                        {{ t.config.cancel }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div v-else style="font-size: 13px; color: #888;">
                            {{ t.config.flashingFirmware }}…
                        </div>
                    </div>
                </div>
            </template>
        </div>
    `
});
