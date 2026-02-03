/**
 * YAML Generator Mixin
 * Handles ESPHome sensor YAML generation
 */
const YamlGeneratorMixin = {
    methods: {
        generateYaml() {
            // Check if there are pending changes that need to be applied first
            if (this.hasPendingChanges) {
                if (confirm(this.t.yamlModal.applyFirst)) {
                    this.generateYamlAfterApply = true;
                    this.applyAllChanges();
                }
                return;
            }

            let yaml = 'sensor:\n';

            const numVoltages = this.voltageChannelCount;
            const voltageLabel = this.t.liveData.groups.V;
            for (let i = 0; i < numVoltages; i++) {
                if (this.device.hardware === 'emonPi3' && this.device.vchannels[i] && !this.device.vchannels[i].active) {
                    continue;
                }
                const vName = this.channelNames.voltage[String(i + 1)];
                const defaultVName = numVoltages > 1 ? `${voltageLabel} L${i + 1}` : voltageLabel;
                yaml += `  - platform: emontx\n`;
                yaml += `    tag_name: "V${i + 1}"\n`;
                yaml += `    name: "${vName || defaultVName}"\n`;
            }

            for (let i = 0; i < this.device.ichannels.length; i++) {
                const channel = this.device.ichannels[i];
                if (this.device.hardware === 'emonPi3' && channel.active === false) {
                    continue;
                }
                const ctName = this.channelNames.ct[String(i + 1)];
                const powerLabel = this.t.config.power;
                const energyLabel = this.t.config.energy;
                const powerName = ctName ? `${ctName} ${powerLabel}` : `${powerLabel} ${i + 1}`;
                const energyName = ctName ? `${ctName} ${energyLabel}` : `${energyLabel} ${i + 1}`;

                yaml += `  - platform: emontx\n`;
                yaml += `    tag_name: "P${i + 1}"\n`;
                yaml += `    name: "${powerName}"\n`;

                yaml += `  - platform: emontx\n`;
                yaml += `    tag_name: "E${i + 1}"\n`;
                yaml += `    name: "${energyName}"\n`;
            }

            // OPA channels (pulse sensors)
            const pulseLabel = this.t.liveData.groups.pulse;
            for (let i = 0; i < this.device.opa.length; i++) {
                const opa = this.device.opa[i];
                // Only generate for active pulse channels (not OneWire)
                if (!opa.active || opa.func === 'o') {
                    continue;
                }
                const opaName = this.channelNames.opa[String(i + 1)];
                const sensorName = opaName ? `${opaName} ${pulseLabel}` : `${pulseLabel} ${i + 1}`;

                yaml += `  - platform: emontx\n`;
                yaml += `    tag_name: "pulse${i + 1}"\n`;
                yaml += `    name: "${sensorName}"\n`;
            }

            // Temperature sensors
            const tempLabel = this.t.liveData.groups.T;
            for (let i = 0; i < this.device.tempSensors.length; i++) {
                const sensor = this.device.tempSensors[i];
                const slot = sensor.slot || (i + 1);
                const tempName = this.channelNames.temp[sensor.addr];
                const sensorName = tempName || `${tempLabel} ${slot}`;

                yaml += `  - platform: emontx\n`;
                yaml += `    tag_name: "T${slot}"\n`;
                yaml += `    name: "${sensorName}"\n`;
            }

            this.generatedYaml = yaml;
            this.showYamlModal = true;
        }
    }
};
