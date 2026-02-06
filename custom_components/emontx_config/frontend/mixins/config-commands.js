/**
 * Config Commands Mixin
 * Handles device configuration commands and settings
 */
const ConfigCommandsMixin = {
    methods: {
        // Command sending
        writeToStream(cmd) {
            if (!this.deviceName || (!this.hass && !this.ws)) {
                this.log('Not connected', 'error');
                return;
            }
            this.log('TX: ' + cmd, 'sent');

            if (this.hass && this.hass.callService) {
                this.hass.callService('esphome', this.deviceName + '_send_command', { command: cmd });
            } else if (this.ws) {
                this.ws.send(JSON.stringify({
                    id: this.wsMessageId++,
                    type: 'call_service',
                    domain: 'esphome',
                    service: this.deviceName + '_send_command',
                    service_data: { command: cmd }
                }));
            }
        },

        // Configuration methods
        loadConfig() {
            // Clear error highlighting when reloading config
            this.failedCtIndices = [];
            this.failedCtFields = [];
            this.failedVcalIndices = [];
            this.writeToStream('l');

            // Load both found sensors (ol) and saved sensors (on) after config is received
            // Need sufficient delay between commands to let serial output complete
            setTimeout(() => {
                this.listTempSensors();  // 'ol' - found sensors on bus
            }, 500);
            setTimeout(() => {
                this.listSavedTempSensors();  // 'on' - saved sensors in NVM
            }, 2500);  // Wait longer for ol to complete (8 sensors @ ~200ms each)

            // Update originalDevice after config is fully received to clear pending changes
            setTimeout(() => {
                if (this.configReceived) {
                    this.originalDevice = JSON.parse(JSON.stringify(this.device));
                }
            }, 4000);
        },

        async applyAllChanges() {
            const changes = this.pendingChangesList;
            if (changes.length === 0) return;

            // Check for high RF power setting (>= 25 = 7dBm+)
            const hasHighRfPower = changes.some(c => c.type === 'rfPower') && this.device.rfPower >= 25;
            if (hasHighRfPower && !this.rfPowerWarningConfirmed) {
                this.showRfPowerWarning = true;
                return;
            }

            // Clear the confirmation flag for next time
            this.rfPowerWarningConfirmed = false;

            // Clear previous error highlighting
            this.failedCtIndices = [];
            this.failedCtFields = [];
            this.failedVcalIndices = [];

            this.applyProgress = { current: 0, total: changes.length, currentItem: '' };
            this.log(`Applying ${changes.length} configuration changes...`, 'info');

            const successfulChanges = [];
            const failedChanges = [];

            for (let i = 0; i < changes.length; i++) {
                const change = changes[i];
                this.applyProgress = { current: i, total: changes.length, currentItem: this.getChangeLabel(change) };

                try {
                    // Get the acknowledgment pattern for this change type
                    const ackPattern = this.getAckPattern(change);
                    const responsePromise = ackPattern ? this.waitForResponse(ackPattern) : null;

                    // Send the command
                    this.applyChange(change);

                    // Wait for acknowledgment if pattern is defined
                    if (responsePromise) {
                        await responsePromise;
                    }

                    // Add delay after tempSlot changes to let serial buffer clear
                    if (change.type === 'tempSlot') {
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }

                    this.log(`Applied: ${this.getChangeLabel(change)}`, 'info');
                    successfulChanges.push(change);
                } catch (e) {
                    this.log(`Failed to apply: ${this.getChangeLabel(change)} (timeout or rejected)`, 'error');
                    failedChanges.push(change);
                }
            }

            // Update originalDevice only for successful changes
            if (successfulChanges.length > 0) {
                for (const change of successfulChanges) {
                    this.markChangeAsApplied(change);
                }
            }

            // Track failed changes for error highlighting
            for (const change of failedChanges) {
                if (change.type === 'vchannel') {
                    this.failedVcalIndices.push(change.index);
                } else if (change.type === 'ichannel') {
                    this.failedCtIndices.push(change.index);
                    // Mark all ichannel fields as failed
                    this.failedCtFields = ['ical', 'ilead', 'vchan1', 'vchan2'];
                }
            }

            // Show summary
            const statusItem = failedChanges.length > 0
                ? `${successfulChanges.length}/${changes.length} applied, ${failedChanges.length} failed`
                : 'Done';
            this.applyProgress = { current: changes.length, total: changes.length, currentItem: statusItem };

            if (failedChanges.length > 0) {
                this.log(`Applied ${successfulChanges.length}/${changes.length} changes, ${failedChanges.length} failed`, 'warning');
            } else {
                this.log(`Applied ${successfulChanges.length} changes`, 'info');
            }

            setTimeout(() => {
                this.applyProgress = null;

                // Check if YAML generation was requested before apply
                if (this.generateYamlAfterApply) {
                    this.generateYamlAfterApply = false;
                    if (failedChanges.length > 0) {
                        alert(this.t.yamlModal.fixErrorsFirst);
                    } else {
                        this.generateYaml();
                    }
                }
            }, failedChanges.length > 0 ? 2000 : 500);
        },

        markChangeAsApplied(change) {
            // Update originalDevice for this specific change so it's no longer pending
            // Use $set for arrays to ensure Vue 2 reactivity
            if (!this.originalDevice) return;

            switch (change.type) {
                case 'vchannel':
                    if (this.originalDevice.vchannels && this.device.vchannels) {
                        this.$set(this.originalDevice.vchannels, change.index, JSON.parse(JSON.stringify(this.device.vchannels[change.index])));
                    }
                    break;
                case 'ichannel':
                    if (this.originalDevice.ichannels && this.device.ichannels) {
                        this.$set(this.originalDevice.ichannels, change.index, JSON.parse(JSON.stringify(this.device.ichannels[change.index])));
                    }
                    break;
                case 'opa':
                    if (this.originalDevice.opa && this.device.opa) {
                        this.$set(this.originalDevice.opa, change.index, JSON.parse(JSON.stringify(this.device.opa[change.index])));
                    }
                    break;
                case 'radio':
                    this.$set(this.originalDevice, 'RF', this.device.RF);
                    break;
                case 'rfNode':
                    this.$set(this.originalDevice, 'rfNode', this.device.rfNode);
                    break;
                case 'rfGroup':
                    this.$set(this.originalDevice, 'rfGroup', this.device.rfGroup);
                    break;
                case 'rf433Toggle':
                    this.$set(this.originalDevice, 'rf433High', this.device.rf433High);
                    break;
                case 'rfPower':
                    this.$set(this.originalDevice, 'rfPower', this.device.rfPower);
                    break;
                case 'datalog':
                    this.$set(this.originalDevice, 'datalog', this.device.datalog);
                    break;
                case 'json':
                    this.$set(this.originalDevice, 'json', this.device.json);
                    break;
                case 'tempSlot':
                    // Update originalDevice.tempSensors with the new slot
                    if (this.originalDevice.tempSensors) {
                        const origSensor = this.originalDevice.tempSensors.find(s => s.addr === change.addr);
                        if (origSensor) {
                            origSensor.slot = change.slot;
                        }
                    }
                    break;
            }
        },

        getAckPattern(change) {
            // Returns the acknowledgment pattern to wait for after sending a command
            // Based on firmware response format
            switch (change.type) {
                case 'vchannel':
                    return `vCal${change.index + 1} =`;
                case 'ichannel':
                    return `iCal${change.index + 1} =`;
                case 'opa':
                    return `opa${change.index + 1} active =`;
                case 'radio':
                    return 'RF =';
                case 'rfNode':
                    return 'rfNode =';
                case 'rfGroup':
                    return 'rfGroup =';
                case 'rf433Toggle':
                    return 'rfBand =';
                case 'rfPower':
                    return 'rfPower =';
                case 'datalog':
                    return 'datalog =';
                case 'json':
                    return 'json =';
                case 'tempSlot':
                    return `1W_addr${change.slot} =`;
                default:
                    return null;
            }
        },

        applyChange(change) {
            switch (change.type) {
                case 'vchannel':
                    this.setVchannel(change.index);
                    break;
                case 'ichannel':
                    this.setIcal(change.index);
                    break;
                case 'opa':
                    this.setOpa(change.index);
                    break;
                case 'radio':
                    this.setRadio();
                    break;
                case 'rfNode':
                    this.setRfNode();
                    break;
                case 'rfGroup':
                    this.setRfGroup();
                    break;
                case 'rf433Toggle':
                    this.setRf433Toggle();
                    break;
                case 'rfPower':
                    this.setRfPower();
                    break;
                case 'datalog':
                    this.setDatalog();
                    break;
                case 'json':
                    this.setJson();
                    break;
                case 'tempSlot':
                    this.applyTempSensorSlot(change.addr, change.slot);
                    break;
            }
        },

        getChangeLabel(change) {
            switch (change.type) {
                case 'vchannel': return `V${change.index + 1}`;
                case 'ichannel': return `CT${change.index + 1}`;
                case 'opa': return `OPA${change.index + 1}`;
                case 'radio': return 'RF Enable';
                case 'rfNode': return 'RF Node';
                case 'rfGroup': return 'RF Group';
                case 'rf433Toggle': return 'RF 433 Variant';
                case 'rfPower': return 'RF Power';
                case 'datalog': return 'Datalog';
                case 'json': return 'JSON';
                case 'tempSlot': return `T${change.slot}`;
                default: return change.type;
            }
        },

        discardChanges() {
            if (this.originalDevice) {
                this.device = JSON.parse(JSON.stringify(this.originalDevice));
                // Clear error highlighting when discarding changes
                this.failedCtIndices = [];
                this.failedCtFields = [];
                this.failedVcalIndices = [];
                this.log('Changes discarded', 'info');
            }
        },

        setVcal() {
            this.writeToStream('k0 ' + parseFloat(this.device.vcal).toFixed(2) + ' 0');
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        setVchannel(i) {
            const active = this.device.vchannels[i].active ? 1 : 0;
            const vcal = parseFloat(this.device.vchannels[i].vcal).toFixed(2);
            const vphase = parseFloat(this.device.vchannels[i].vphase || 0).toFixed(2);
            this.writeToStream('k' + (i + 1) + ' ' + active + ' ' + vcal + ' ' + vphase);
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        setIcal(i) {
            const ical = parseFloat(this.device.ichannels[i].ical).toFixed(2);
            const ilead = parseFloat(this.device.ichannels[i].ilead || 0).toFixed(2);
            if (this.device.hardware === 'emonPi3') {
                const active = this.device.ichannels[i].active ? 1 : 0;
                this.writeToStream('k' + (i + 4) + ' ' + active + ' ' + ical + ' ' + ilead + ' ' + this.device.ichannels[i].vchan1 + ' ' + this.device.ichannels[i].vchan2);
            } else {
                this.writeToStream('k' + (i + 1) + ' ' + ical + ' ' + ilead);
            }
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        waitForResponse(pattern, timeout = 5000) {
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    this.pendingResponse = null;
                    reject(new Error('Response timeout'));
                }, timeout);

                this.pendingResponse = {
                    pattern: pattern,
                    resolve: () => {
                        clearTimeout(timeoutId);
                        resolve();
                    },
                    reject: () => {
                        clearTimeout(timeoutId);
                        this.pendingResponse = null;
                        reject(new Error('Command rejected'));
                    }
                };
            });
        },

        async applyBulkCtSettings(changes) {
            // Apply values to selected channels one by one, waiting for acknowledgment
            const total = changes.channels.length;
            const failedChannels = [];
            const failedIndices = [];
            this.failedCtIndices = [];  // Clear previous failures
            this.failedCtFields = Object.keys(changes.values);  // Track which fields were being applied
            this.bulkProgress = { current: 0, total: total, currentCt: 0, error: false, failedChannels: [] };
            this.log(`Applying bulk settings to ${total} channels...`, 'info');

            for (let i = 0; i < changes.channels.length; i++) {
                const idx = changes.channels[i];
                const ctNum = idx + 1;
                this.bulkProgress = { current: i, total: total, currentCt: ctNum, error: false, failedChannels: failedChannels };

                if (idx < this.device.ichannels.length) {
                    if (changes.values.active !== undefined) {
                        this.$set(this.device.ichannels[idx], 'active', changes.values.active);
                    }
                    if (changes.values.ical !== undefined) {
                        this.$set(this.device.ichannels[idx], 'ical', changes.values.ical);
                    }
                    if (changes.values.ilead !== undefined) {
                        this.$set(this.device.ichannels[idx], 'ilead', changes.values.ilead);
                    }
                    if (changes.values.vchan1 !== undefined) {
                        this.$set(this.device.ichannels[idx], 'vchan1', changes.values.vchan1);
                    }
                    if (changes.values.vchan2 !== undefined) {
                        this.$set(this.device.ichannels[idx], 'vchan2', changes.values.vchan2);
                    }

                    // Send command and wait for iCal acknowledgment (only sent if config accepted)
                    try {
                        const responsePromise = this.waitForResponse(`iCal${ctNum} =`);
                        this.setIcal(idx);
                        await responsePromise;
                        this.log(`Configured CT ${ctNum} (${i + 1}/${total})`, 'info');
                        // Update originalDevice so this channel is no longer shown as pending
                        if (this.originalDevice && this.originalDevice.ichannels) {
                            this.$set(this.originalDevice.ichannels, idx, JSON.parse(JSON.stringify(this.device.ichannels[idx])));
                        }
                    } catch (e) {
                        failedChannels.push(ctNum);
                        failedIndices.push(idx);
                        this.bulkProgress = { ...this.bulkProgress, error: true, failedChannels: failedChannels };
                        this.log(`CT ${ctNum} config rejected (${i + 1}/${total})`, 'error');
                    }
                }
            }
            // Store failed indices for highlighting in UI
            this.failedCtIndices = failedIndices;
            // Show completion with error summary if any failed
            const hasErrors = failedChannels.length > 0;
            this.bulkProgress = { current: total, total: total, currentCt: 0, error: hasErrors, failedChannels: failedChannels };
            if (hasErrors) {
                this.log(`Bulk settings: ${total - failedChannels.length}/${total} applied, failed: CT ${failedChannels.join(', CT ')}`, 'warning');
            } else {
                this.log(`Bulk settings applied to ${total} channels`, 'info');
            }
            // Close modal after delay only if no errors
            // If errors, keep modal open so user can see which CTs failed
            if (!hasErrors) {
                setTimeout(() => {
                    this.showBulkCtModal = false;
                    this.bulkProgress = null;
                }, 500);
            }
        },

        openBulkCtModal() {
            this.showBulkCtModal = true;
            this.bulkProgress = null;
            // Clear previous error highlighting when starting fresh
            this.failedCtIndices = [];
            this.failedCtFields = [];
        },

        closeBulkModal() {
            // Allow closing if not in progress, or if complete (with or without errors)
            if (!this.bulkProgress || (this.bulkProgress.current === this.bulkProgress.total)) {
                this.showBulkCtModal = false;
                this.bulkProgress = null;
                // Don't clear failedCtIndices/failedCtFields - keep showing errors on main page
            }
        },

        setRadio() {
            this.writeToStream('w' + (this.device.RF ? 1 : 0));
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        setRfNode() {
            this.writeToStream('n' + Math.round(this.device.rfNode));
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        setRfGroup() {
            this.writeToStream('g' + Math.round(this.device.rfGroup));
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        setRf433Toggle() {
            // x command: x0 = 433.92 MHz, x1 = 433.00 MHz
            this.writeToStream('x' + (this.device.rf433High ? '1' : '0'));
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        setRfPower() {
            const power = Math.max(0, Math.min(31, Math.round(this.device.rfPower)));
            this.writeToStream('p' + power);
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        setPulse() {
            this.writeToStream('m' + (this.device.pulse ? '1 ' + this.device.pulsePeriod : '0'));
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        setPulsePeriod() {
            this.writeToStream('m1 ' + Math.round(this.device.pulsePeriod));
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        setDatalog() {
            this.writeToStream('d' + parseFloat(this.device.datalog));
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        setJson() {
            this.writeToStream('j' + this.device.json);
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        setOpa(idx) {
            const opa = this.device.opa[idx];
            const channel = idx + 1;
            const active = opa.active ? 1 : 0;
            const funcChar = opa.func;  // 'o' for OneWire, 'r'/'f'/'b' for pulse modes
            const pullUp = opa.pullUp ? 1 : 0;
            const period = Math.round(opa.period) || 0;

            this.writeToStream('m' + channel + ' ' + active + ' ' + funcChar + ' ' + pullUp + ' ' + period);
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        scanTempSensors() {
            this.device.tempSensors = [];  // Clear found sensors
            this.tempScanLoading = true;
            this.writeToStream('of');
            this.log('Scanning for temperature sensors...', 'info');
            setTimeout(() => {
                this.listTempSensors();
                this.tempScanLoading = false;
            }, 2000);
        },

        listTempSensors() {
            this.writeToStream('ol');
        },

        listSavedTempSensors() {
            this.device.savedTempSensors = [];
            this.writeToStream('on');
        },

        saveTempMapping() {
            this.writeToStream('os');
            this.changes = true;
            this.hasUnsavedChanges = true;
            this.log('Temperature sensor mapping saved', 'info');
            // Refresh both found and saved sensors list to update status
            setTimeout(() => this.listTempSensors(), 500);
            setTimeout(() => this.listSavedTempSensors(), 2500);
        },

        async clearTempSlot(slot) {
            const ackPattern = `Cleared saved 1-Wire address for channel ${slot}`;
            const responsePromise = this.waitForResponse(ackPattern);
            this.writeToStream('oc' + slot);
            this.log(`Clearing temperature slot T${slot}...`, 'info');
            try {
                await responsePromise;
                this.log(`Cleared slot T${slot}`, 'info');
                this.changes = true;
                this.hasUnsavedChanges = true;
            } catch (e) {
                this.log(`Clear slot T${slot} timeout`, 'warning');
            }
            // Delay before next command to let serial buffer clear
            await new Promise(resolve => setTimeout(resolve, 300));
            this.listTempSensors();
            // Also refresh saved sensors list (wait for ol to complete)
            setTimeout(() => this.listSavedTempSensors(), 2000);
        },

        async clearAllTempSlots() {
            const ackPattern = 'Cleared all saved 1-Wire addresses';
            const responsePromise = this.waitForResponse(ackPattern);
            this.writeToStream('oca');
            this.log('Clearing all temperature slot assignments...', 'info');
            try {
                await responsePromise;
                this.log('Cleared all slots', 'info');
                this.changes = true;
                this.hasUnsavedChanges = true;
            } catch (e) {
                this.log('Clear all slots timeout', 'warning');
            }
            // Delay before next command to let serial buffer clear
            await new Promise(resolve => setTimeout(resolve, 300));
            this.listTempSensors();
            // Also refresh saved sensors list (wait for ol to complete)
            setTimeout(() => this.listSavedTempSensors(), 2000);
        },

        syncOriginalTempSensors() {
            // Sync originalDevice.tempSensors with current device.tempSensors
            // Called when sensors are parsed from device to establish baseline for change detection
            if (this.originalDevice) {
                this.originalDevice.tempSensors = JSON.parse(JSON.stringify(this.device.tempSensors));
            }
        },

        assignTempSensorToSlot(slot, addr) {
            // Update local state only - actual command sent on Apply
            if (!addr) {
                this.log('No sensor address provided', 'error');
                return;
            }
            // Find the sensor by address and update its slot
            const sensorIdx = this.device.tempSensors.findIndex(s => s.addr === addr);
            if (sensorIdx >= 0) {
                this.$set(this.device.tempSensors[sensorIdx], 'slot', slot);
            }
        },

        applyTempSensorSlot(addr, slot) {
            // Send the actual command to assign sensor to the specified slot
            const bytes = addr.replace(/:/g, ' ').trim();
            this.writeToStream('o' + slot + ' ' + bytes);
            this.changes = true;
            this.hasUnsavedChanges = true;
        },

        saveConfig() {
            this.writeToStream('s');
            this.changes = false;
            this.hasUnsavedChanges = false;
            this.log('Configuration saved!', 'info');
        },

        resetDefaults() {
            if (confirm('Reset all settings to default values?')) {
                this.writeToStream('r');
                this.changes = true;
                this.hasUnsavedChanges = true;
                setTimeout(() => this.loadConfig(), 1000);
            }
        },

        restoreSaved() {
            this.writeToStream('rs');
            this.log('Restoring saved settings from NVM...', 'info');
            this.hasUnsavedChanges = false;
            setTimeout(() => this.loadConfig(), 1000);
        },

        rebootDevice() {
            this.showRebootConfirm = true;
        },

        confirmReboot() {
            this.showRebootConfirm = false;
            this.writeToStream('q');
            // Firmware requires 'y' confirmation
            setTimeout(() => {
                this.writeToStream('y');
                this.log('Rebooting device...', 'info');
                // Reload config after reboot (give device time to restart)
                setTimeout(() => {
                    this.loadConfig();
                }, 5000);
            }, 500);
        },

        cancelReboot() {
            this.showRebootConfirm = false;
        },

        zeroEnergy() {
            this.showZeroConfirm = true;
        },

        confirmZero() {
            this.writeToStream('z');
            setTimeout(() => {
                this.writeToStream('y');
                if (this.device.hardware === 'emonPi3') {
                    setTimeout(() => this.writeToStream('lh'), 1500);
                }
            }, 1000);
            this.showZeroConfirm = false;
        },

        cancelZero() {
            this.showZeroConfirm = false;
        },

        confirmRfPower() {
            this.showRfPowerWarning = false;
            this.rfPowerWarningConfirmed = true;
            this.applyAllChanges();
        },

        cancelRfPower() {
            this.showRfPowerWarning = false;
        },

        showIndividualZeroConfirm(type, channel) {
            this.individualZeroTarget = { type, channel };
            this.showIndividualZeroModal = true;
        },

        confirmIndividualZero() {
            const { type, channel } = this.individualZeroTarget;
            if (type === 'e') {
                this.writeToStream('ze' + channel);
            } else if (type === 'p') {
                this.writeToStream('zp' + channel);
            }
            setTimeout(() => {
                this.writeToStream('y');
                setTimeout(() => this.writeToStream('lh'), 1500);
            }, 1000);
            this.showIndividualZeroModal = false;
        },

        cancelIndividualZero() {
            this.showIndividualZeroModal = false;
        }
    }
};
