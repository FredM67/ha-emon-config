/**
 * Data Parser Mixin
 * Handles parsing of device responses and live data
 */
const DataParserMixin = {
    methods: {
        // Data handling
        handleEmontxData(data) {
            // Normalize device IDs: ESPHome uses hyphens in device_id but underscores in service names
            if (data.device_id) {
                const normalizedEventDevice = data.device_id.replace(/_/g, '-');
                const normalizedSelectedDevice = this.selectedDevice.replace(/_/g, '-');
                if (normalizedEventDevice !== normalizedSelectedDevice) {
                    return;
                }
            }

            let line = '';
            if (data.line) {
                line = data.line;
            } else if (typeof data === 'string') {
                line = data;
            } else {
                return;
            }

            this.log('RX: ' + line);

            if (line.includes('unsaved changes') || line.includes('Unsaved changes')) {
                this.hasUnsavedChanges = true;
            }

            if (line.includes('settings saved') || line.includes('Settings saved')) {
                this.hasUnsavedChanges = false;
            }

            const sensorRegex = /"?(\w+)"?\s*:\s*"?([^",}\s]+)"?/g;
            let match;
            const sensorData = {};
            let firstKey = null;

            while ((match = sensorRegex.exec(line)) !== null) {
                const key = match[1];
                const value = match[2];
                if (firstKey === null) firstKey = key;
                const numValue = parseFloat(value);
                sensorData[key] = isNaN(numValue) ? value : numValue;
            }

            if (firstKey === 'MSG') {
                this.liveData = sensorData;
                this.emontxConnected = true;
                this.emontxStatus = 'Connected';

                // Update voltage channels with live voltage data
                for (let v = 0; v < this.device.vchannels.length; v++) {
                    const vKey = 'V' + (v + 1);
                    if (sensorData[vKey] !== undefined) {
                        this.$set(this.device.vchannels[v], 'voltage', sensorData[vKey] + ' V');
                    }
                }

                // Update current channels with live power/energy data
                for (let c = 0; c < this.device.ichannels.length; c++) {
                    const pKey = 'P' + (c + 1);
                    const eKey = 'E' + (c + 1);
                    if (sensorData[pKey] !== undefined) {
                        this.$set(this.device.ichannels[c], 'power', sensorData[pKey] + ' W');
                    }
                    if (sensorData[eKey] !== undefined) {
                        this.$set(this.device.ichannels[c], 'energy', sensorData[eKey] + ' Wh');
                    }
                }
            } else if (line.includes(' = ') || line.includes('> Error:') || line.match(/^\d+\s+\[->/) || line.match(/^\[\d\]/) ) {
                // Process configuration lines, errors, temperature sensor list (ol), and saved sensors (on)
                this.processLine(line);
            }
        },

        processLine(line) {
            // Check for pending response (used by bulk operations)
            if (this.pendingResponse) {
                // Check for success pattern
                if (line.includes(this.pendingResponse.pattern)) {
                    this.pendingResponse.resolve();
                    this.pendingResponse = null;
                }
                // Check for error response (device sends "> Error: " prefix)
                else if (line.includes('> Error:')) {
                    this.pendingResponse.reject();
                }
            }

            if (line.startsWith('firmware = ')) {
                this.device.firmware = line.split('=')[1].trim();
                this.configReceived = true;

                if (this.device.firmware.includes('6CT')) {
                    this.populateChannels(6);
                } else if (this.device.firmware.includes('12CT')) {
                    this.populateChannels(12);
                }
            }

            if (line.startsWith('hardware = ')) {
                this.device.hardware = line.split('=')[1].trim();
                if (this.device.hardware === 'emonPi3') {
                    this.populateChannels(12);
                }
            }

            if (line.startsWith('hardware_rev = ')) {
                this.device.hardware_rev = line.split('=')[1].trim();
            }

            if (line.startsWith('Settings:')) {
                this.configReceived = true;
                this.upgradeRequired = true;
            }

            // Parse OPA configuration (opa1, opa2, opa3)
            // Format: "opa1 active = 1, pulse, pullUp = off, pulsePeriod = 100"
            const opaMatch = line.match(/^opa([1-3]) (.+)$/);
            if (opaMatch) {
                const opaIdx = parseInt(opaMatch[1]) - 1;
                const content = opaMatch[2].trim();

                const activeMatch = content.match(/active\s*=\s*(\w+)/);
                if (activeMatch) {
                    this.$set(this.device.opa[opaIdx], 'active', activeMatch[1] === 'on' || activeMatch[1] === '1');
                }

                if (content.includes('onewire')) {
                    this.$set(this.device.opa[opaIdx], 'func', 'o');
                } else if (content.includes('pulse')) {
                    // Detect edge type: rising, falling, or both
                    let pulseMode = 'b';  // default to both
                    if (content.includes('rising')) {
                        pulseMode = 'r';
                    } else if (content.includes('falling')) {
                        pulseMode = 'f';
                    } else if (content.includes('both')) {
                        pulseMode = 'b';
                    }
                    this.$set(this.device.opa[opaIdx], 'func', pulseMode);

                    const pullUpMatch = content.match(/pullUp\s*=\s*(\w+)/);
                    if (pullUpMatch) {
                        this.$set(this.device.opa[opaIdx], 'pullUp', pullUpMatch[1] === 'on');
                    }

                    const periodMatch = content.match(/pulsePeriod\s*=\s*(\d+)/);
                    if (periodMatch) {
                        this.$set(this.device.opa[opaIdx], 'period', parseInt(periodMatch[1]));
                    }
                }
            }

            // Parse temperature sensor list from 'ol' command
            // Format: <bus_index> [-> <slot>] <address>
            // bus_index = order found on OneWire bus
            // slot = assigned T slot (1-8), determines JSON key (T1-T8)
            const tempMatch = line.match(/^(\d+)\s+\[->\s*(\d+)\s*\]\s+(.+)$/);
            if (tempMatch) {
                const busIndex = parseInt(tempMatch[1]);
                const slot = parseInt(tempMatch[2]);
                const addr = tempMatch[3].trim();
                // Store sensor with bus index for slot reassignment
                // Find existing entry with same bus index or add new one
                const existingIdx = this.device.tempSensors.findIndex(s => s.busIndex === busIndex);
                const sensorData = { busIndex: busIndex, slot: slot, addr: addr };
                if (existingIdx >= 0) {
                    this.$set(this.device.tempSensors, existingIdx, sensorData);
                } else {
                    this.device.tempSensors.push(sensorData);
                }
                // Sync to originalDevice so slot changes can be detected as pending
                this.syncOriginalTempSensors();
            }

            // Parse saved temperature sensor list from 'on' command
            // Format: [1] 28 c0 c0 03 00 00 00 2b
            //         [2] 00 00 00 00 00 00 00 00
            // Slot index is 1-8, empty slots have all zeros
            const savedTempMatch = line.trim().match(/^\[(\d)\]\s+([0-9a-fA-F]{2}(?:\s+[0-9a-fA-F]{2}){7})$/);
            if (savedTempMatch) {
                const slot = parseInt(savedTempMatch[1]);  // Already 1-based from firmware
                const addrBytes = savedTempMatch[2].trim();

                // Check if slot is empty (all zeros)
                const isEmptySlot = addrBytes.replace(/\s+/g, '') === '0000000000000000';

                if (!isEmptySlot) {
                    // Convert space-separated bytes to colon-separated format
                    const addr = addrBytes;
                    // Store in savedTempSensors array (separate from found sensors)
                    const existingIdx = this.device.savedTempSensors.findIndex(s => s.slot === slot);
                    const sensorData = { slot: slot, addr: addr };
                    if (existingIdx >= 0) {
                        this.$set(this.device.savedTempSensors, existingIdx, sensorData);
                    } else {
                        this.device.savedTempSensors.push(sensorData);
                    }
                }
            }

            // Parse accumulator values
            const energyMatch = line.match(/^\s*E(\d+)\s*=\s*(-?\d+)\s*Wh/);
            if (energyMatch) {
                const key = 'E' + energyMatch[1];
                const val = parseInt(energyMatch[2]);
                this.$set(this.liveData, key, val);
            }
            const pulseMatch = line.match(/^\s*pulse(\d+)\s*=\s*(\d+)/);
            if (pulseMatch) {
                const key = 'pulse' + pulseMatch[1];
                const val = parseInt(pulseMatch[2]);
                this.$set(this.liveData, key, val);
            }

            // Parse key=value pairs
            const sublines = line.split(',');
            for (const subline of sublines) {
                const keyval = subline.split('=');
                if (keyval.length === 2) {
                    const key = keyval[0].trim();
                    const val = keyval[1].trim();

                    if (key.startsWith('iCal')) {
                        this.configReceived = true;
                        const c = parseInt(key.substring(4).trim()) - 1;
                        if (c >= 0 && c < this.device.ichannels.length) {
                            this.device.ichannels[c].ical = Math.round(parseFloat(val));
                        }
                    }
                    else if (key.startsWith('iLead')) {
                        const c = parseInt(key.substring(5).trim()) - 1;
                        if (c >= 0 && c < this.device.ichannels.length) {
                            this.device.ichannels[c].ilead = parseFloat(val);
                        }
                    }
                    else if (key.startsWith('iActive')) {
                        const c = parseInt(key.substring(7).trim()) - 1;
                        if (c >= 0 && c < this.device.ichannels.length) {
                            this.$set(this.device.ichannels[c], 'active', val === 'on' || val === '1');
                        }
                    }
                    else if (key.startsWith('v1Chan')) {
                        const c = parseInt(key.substring(6).trim()) - 1;
                        if (c >= 0 && c < this.device.ichannels.length) {
                            this.$set(this.device.ichannels[c], 'vchan1', parseInt(val));
                        }
                    }
                    else if (key.startsWith('v2Chan')) {
                        const c = parseInt(key.substring(6).trim()) - 1;
                        if (c >= 0 && c < this.device.ichannels.length) {
                            this.$set(this.device.ichannels[c], 'vchan2', parseInt(val));
                        }
                    }
                    else if (key === 'vCal') {
                        this.device.vcal = parseFloat(val);
                    }
                    else if (key.startsWith('vCal') && key.length > 4) {
                        const c = parseInt(key.substring(4).trim()) - 1;
                        if (c >= 0 && c < this.device.vchannels.length) {
                            this.$set(this.device.vchannels[c], 'vcal', parseFloat(val));
                        }
                    }
                    else if (key.startsWith('vActive')) {
                        const c = parseInt(key.substring(7).trim()) - 1;
                        if (c >= 0 && c < this.device.vchannels.length) {
                            this.$set(this.device.vchannels[c], 'active', val === 'on' || val === '1');
                        }
                    }
                    else if (key.startsWith('vLead')) {
                        const c = parseInt(key.substring(5).trim()) - 1;
                        if (c >= 0 && c < this.device.vchannels.length) {
                            this.$set(this.device.vchannels[c], 'vphase', parseFloat(val));
                        }
                    }
                    else if (key === 'version') {
                        this.device.firmware_version = val;
                        // Check for firmware updates (only for emonPi3/emonTx6)
                        if (this.device.hardware === 'emonPi3') {
                            this.checkFirmwareUpdate();
                        }
                    }
                    else if (key === 'commit') {
                        this.device.firmware_commit = val;
                    }
                    else if (key === 'voltage') {
                        this.device.voltage = val;
                    }
                    else if (key === 'RF') {
                        this.device.RF = val === 'on';
                    }
                    else if (key === 'rfNode') {
                        this.device.rfNode = parseInt(val);
                    }
                    else if (key === 'rfGroup') {
                        this.device.rfGroup = parseInt(val);
                    }
                    else if (key === 'rfBand') {
                        this.device.rfBand = val;
                        // Set rf433High based on which 433 MHz variant
                        // rf433High=false means 433.92 MHz (x0), rf433High=true means 433.00 MHz (x1)
                        if (val.includes('433.00') || val.includes('433 MHz')) {
                            this.device.rf433High = true;  // 433.00 MHz
                        } else if (val.includes('433.92')) {
                            this.device.rf433High = false;  // 433.92 MHz
                        }
                    }
                    else if (key === 'rfPower') {
                        this.device.rfPower = parseInt(val);
                    }
                    else if (key === 'rfFormat') {
                        this.device.rfFormat = val;
                    }
                    else if (key === 'pulse') {
                        this.device.pulse = val !== 'off';
                    }
                    else if (key === 'pulsePeriod') {
                        this.device.pulsePeriod = parseInt(val);
                    }
                    else if (key === 'datalog') {
                        this.device.datalog = parseFloat(val);
                    }
                    else if (key === 'json') {
                        this.device.json = val === 'off' ? 0 : 1;
                    }
                }
            }
        },

        populateChannels(num) {
            this.device.ichannels = [];
            for (let i = 0; i < num; i++) {
                this.device.ichannels.push({
                    active: true,
                    ical: 20,
                    ilead: 0.0,
                    vchan1: 1,
                    vchan2: 1,
                    power: '',
                    energy: ''
                });
            }
        }
    }
};
