/**
 * Temperature Sensors Section Component
 * Handles temperature sensor slot assignments with drag-and-drop interface
 * Shows sensor status: matched, pending, modified, new, or missing
 */
Vue.component('temp-sensors-section', {
    props: {
        device: Object,
        originalDevice: Object,
        t: Object,
        emontxConnected: Boolean,
        tempScanLoading: Boolean,
        liveData: Object,
        channelNames: { type: Object, default: () => ({}) }
    },
    data() {
        return {
            draggedSensor: null,   // Track dragged sensor for drag-and-drop
            dragOverSlot: null     // Track which slot is being dragged over
        };
    },
    methods: {
        // Temperature slot methods
        getSlotSensor(slot) {
            return this.device.tempSensors.find(s => s.slot === slot);
        },
        handleDragStart(sensor, event) {
            // Check if drag started from a text-selectable address field
            const target = event.target;
            const clickedElement = document.elementFromPoint(event.clientX, event.clientY);
            if (clickedElement && (
                clickedElement.classList.contains('sensor-info') ||
                clickedElement.classList.contains('sensor-addr') ||
                clickedElement.classList.contains('saved-addr-info')
            )) {
                event.preventDefault();
                return false;
            }

            this.draggedSensor = sensor;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', sensor.addr);
            // Add dragging class after a short delay to allow the drag image to be captured
            setTimeout(() => {
                event.target.classList.add('dragging');
            }, 0);
        },
        handleDragEnd(event) {
            this.draggedSensor = null;
            this.dragOverSlot = null;
            event.target.classList.remove('dragging');
        },
        handleDragOver(slot, event) {
            // Allow drop on any slot (empty or filled, but not the source slot)
            if (this.draggedSensor && this.draggedSensor.slot !== slot) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                this.dragOverSlot = slot;
            }
        },
        handleDragLeave(slot, event) {
            // Only clear if leaving the slot card itself, not its children
            if (event.currentTarget === event.target || !event.currentTarget.contains(event.relatedTarget)) {
                this.dragOverSlot = null;
            }
        },
        handleDrop(slot, event) {
            event.preventDefault();
            this.dragOverSlot = null;
            if (this.draggedSensor && this.draggedSensor.slot !== slot) {
                const sourceSlot = this.draggedSensor.slot;
                const targetSensor = this.getSlotSensor(slot);

                // Assign dragged sensor to target slot
                this.$emit('assign-temp-slot', slot, this.draggedSensor.addr);

                // If target slot had a sensor, swap it to the source slot
                if (targetSensor) {
                    setTimeout(() => {
                        this.$emit('assign-temp-slot', sourceSlot, targetSensor.addr);
                    }, 500);
                }
            }
        },
        reassignSensor(sensor, newSlot) {
            if (newSlot && newSlot > 0 && newSlot !== sensor.slot) {
                this.$emit('assign-temp-slot', newSlot, sensor.addr);
            }
        },
        getChannelName(type, key) {
            return (this.channelNames[type] && this.channelNames[type][key]) || '';
        },
        onNameChange(type, key, event) {
            this.$emit('update-channel-name', type, key, event.target.value);
        }
    },
    computed: {
        sensorsCount() {
            return this.device.tempSensors.length;
        },
        otherSlots() {
            // Returns slots 1-8 for the reassignment dropdown
            return [1, 2, 3, 4, 5, 6, 7, 8];
        },
        // Merge saved and found sensors with status
        // Status: 'matched' (same slot), 'pending' (local change, needs Apply), 'modified' (applied, needs Save), 'missing' (not found), 'new' (not saved)
        mergedSlotInfo() {
            const result = {};
            const saved = this.device.savedTempSensors || [];
            const found = this.device.tempSensors || [];
            const original = (this.originalDevice && this.originalDevice.tempSensors) || [];

            // Helper to normalize addresses for comparison
            const normalizeAddr = (addr) => addr.replace(/[:\s]+/g, '').toUpperCase();

            // Helper to check if a sensor's slot assignment is pending (not yet applied)
            const isPending = (sensor) => {
                if (!sensor || original.length === 0) return false;
                const origSensor = original.find(s => normalizeAddr(s.addr) === normalizeAddr(sensor.addr));
                return origSensor && origSensor.slot !== sensor.slot;
            };

            // Process all 8 slots
            for (let slot = 1; slot <= 8; slot++) {
                const savedSensor = saved.find(s => s.slot === slot);
                const currentSensor = found.find(s => s.slot === slot);  // Sensor currently in this slot

                if (savedSensor) {
                    const savedAddr = normalizeAddr(savedSensor.addr);

                    if (currentSensor) {
                        const currentAddr = normalizeAddr(currentSensor.addr);
                        if (savedAddr === currentAddr) {
                            // Same address in same slot - MATCHED
                            result[slot] = { status: 'matched', sensor: currentSensor, savedSensor: savedSensor };
                        } else {
                            // Different sensor now in this slot - check if pending or already applied
                            const status = isPending(currentSensor) ? 'pending' : 'modified';
                            result[slot] = { status: status, sensor: currentSensor, savedSensor: savedSensor };
                        }
                    } else {
                        // No sensor currently in this slot - check if saved sensor exists elsewhere
                        const foundElsewhere = found.find(s => normalizeAddr(s.addr) === savedAddr);
                        if (foundElsewhere) {
                            // Saved sensor moved to different slot - check if pending or already applied
                            const status = isPending(foundElsewhere) ? 'pending' : 'modified';
                            result[slot] = { status: status, sensor: null, savedSensor: savedSensor, movedTo: foundElsewhere.slot };
                        } else {
                            // Saved sensor not found at all - MISSING
                            result[slot] = { status: 'missing', sensor: null, savedSensor: savedSensor };
                        }
                    }
                } else {
                    // No saved sensor for this slot
                    if (currentSensor) {
                        // New sensor in this slot - check if pending or already applied
                        const status = isPending(currentSensor) ? 'pending' : 'new';
                        result[slot] = { status: status, sensor: currentSensor, savedSensor: null };
                    } else {
                        // Empty slot
                        result[slot] = { status: 'empty', sensor: null, savedSensor: null };
                    }
                }
            }
            return result;
        },
        hasNewSensors() {
            // Check for new sensors in slots OR unassigned sensors
            return Object.values(this.mergedSlotInfo).some(info => info.status === 'new') ||
                   this.unassignedSensors.length > 0;
        },
        hasMissingSensors() {
            return Object.values(this.mergedSlotInfo).some(info => info.status === 'missing');
        },
        hasModifiedSensors() {
            return Object.values(this.mergedSlotInfo).some(info => info.status === 'modified');
        },
        hasUnsavedMapping() {
            return this.hasNewSensors || this.hasModifiedSensors;
        },
        unassignedSensors() {
            // Sensors with slot=0 are not assigned to any slot
            return (this.device.tempSensors || []).filter(s => s.slot === 0);
        }
    },
    template: `
        <div class="card">
            <div class="card-header">{{ t.config.tempSensors }}</div>
            <div class="card-body">
                <p style="font-size: 13px; color: #666; margin-bottom: 15px;">
                    {{ t.config.tempSensorsDesc }}
                </p>

                <!-- Action Buttons -->
                <div class="button-group" style="margin-bottom: 20px;">
                    <button type="button" class="btn btn-primary" @click="$emit('scan-temp-sensors')" :disabled="!emontxConnected || tempScanLoading" :title="t.tooltips.btnScanSensors">
                        <span v-if="tempScanLoading" class="spinner"></span>
                        {{ t.config.scanSensors || 'Scan Sensors' }}
                    </button>
                    <button type="button" class="btn" @click="$emit('list-temp-sensors')" :disabled="!emontxConnected" :title="t.tooltips.btnListSensors">
                        {{ t.config.listSensors || 'List Sensors' }}
                    </button>
                    <button type="button" class="btn btn-success" @click="$emit('save-temp-mapping')" :disabled="!emontxConnected || sensorsCount === 0" :title="t.tooltips.btnSaveMapping">
                        {{ t.config.saveMapping || 'Save Mapping' }}
                    </button>
                    <button type="button" class="btn btn-danger" @click="$emit('clear-all-temp-slots')" :disabled="!emontxConnected || (sensorsCount === 0 && !hasMissingSensors)" :title="t.tooltips.btnClearAllSlots">
                        {{ t.config.clearAllSlots || 'Clear All' }}
                    </button>
                </div>

                <!-- Temperature Slots Section Header -->
                <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #333;">{{ t.config.tempSlots || 'Temperature Slots' }}</h4>

                <!-- 4x2 Grid of Temperature Slots -->
                <div class="temp-slots-grid">
                    <div v-for="slot in 8" :key="'slot'+slot"
                         class="temp-slot-card"
                         :class="{
                             'filled': mergedSlotInfo[slot].sensor,
                             'drag-over': dragOverSlot === slot,
                             'status-matched': mergedSlotInfo[slot].status === 'matched',
                             'status-new': mergedSlotInfo[slot].status === 'new',
                             'status-missing': mergedSlotInfo[slot].status === 'missing',
                             'status-modified': mergedSlotInfo[slot].status === 'modified',
                             'status-pending': mergedSlotInfo[slot].status === 'pending'
                         }"
                         :draggable="mergedSlotInfo[slot].sensor ? 'true' : 'false'"
                         @dragstart="mergedSlotInfo[slot].sensor && handleDragStart(mergedSlotInfo[slot].sensor, $event)"
                         @dragend="handleDragEnd"
                         @dragover="handleDragOver(slot, $event)"
                         @dragleave="handleDragLeave(slot, $event)"
                         @drop="handleDrop(slot, $event)">

                        <div class="slot-header">
                            <span class="slot-label">T{{ slot }}</span>
                            <span v-if="mergedSlotInfo[slot].status === 'matched'" class="slot-status-badge matched">{{ t.config.statusMatched || '✓' }}</span>
                            <span v-else-if="mergedSlotInfo[slot].status === 'new'" class="slot-status-badge new">{{ t.config.statusNew || '★ New' }}</span>
                            <span v-else-if="mergedSlotInfo[slot].status === 'missing'" class="slot-status-badge missing">{{ t.config.statusMissing || '⚠ Missing' }}</span>
                            <span v-else-if="mergedSlotInfo[slot].status === 'modified'" class="slot-status-badge modified">{{ t.config.statusModified || '✎ Modified' }}</span>
                            <span v-else-if="mergedSlotInfo[slot].status === 'pending'" class="slot-status-badge pending">{{ t.config.statusPending || '⏳ Pending' }}</span>
                            <span v-if="mergedSlotInfo[slot].sensor" class="live-temp" style="margin-left: auto;">{{ liveData['T' + slot] || '-' }}</span>
                        </div>

                        <div class="slot-content">
                            <!-- Empty Slot -->
                            <template v-if="mergedSlotInfo[slot].status === 'empty'">
                                <div class="empty-hint">
                                    <div>{{ t.config.emptySlot || 'Empty' }}</div>
                                    <div style="font-size: 11px; margin-top: 4px;">{{ t.config.dropHint || 'Drag sensor here' }}</div>
                                </div>
                            </template>

                            <!-- Missing Sensor (saved but not found) -->
                            <template v-else-if="mergedSlotInfo[slot].status === 'missing'">
                                <div class="missing-hint">
                                    <div style="font-weight: 500;">{{ t.config.sensorNotFound || 'Sensor not found' }}</div>
                                    <div class="saved-addr-info" style="margin-top: 6px;">{{ mergedSlotInfo[slot].savedSensor.addr }}</div>
                                    <div style="font-size: 11px; margin-top: 4px;">{{ t.config.missingHint || 'Sensor disconnected or failed' }}</div>
                                </div>
                                <button type="button" class="btn-clear-missing" @click.stop="$emit('clear-temp-slot', slot)" :disabled="!emontxConnected">
                                    {{ t.config.clearSlot || 'Clear Slot' }}
                                </button>
                            </template>

                            <!-- Conflict (saved and found different sensors) -->
                            <template v-else-if="mergedSlotInfo[slot].status === 'conflict'">
                                <div class="conflict-info">
                                    <div><strong>{{ t.config.savedSensor || 'Saved' }}:</strong> {{ mergedSlotInfo[slot].savedSensor.addr }}</div>
                                    <div><strong>{{ t.config.foundSensor || 'Found' }}:</strong> {{ mergedSlotInfo[slot].sensor.addr }}</div>
                                </div>
                                <div class="input-label">{{ t.config.name }}</div>
                                <input type="text"
                                       class="sensor-name-input"
                                       :value="getChannelName('temp', mergedSlotInfo[slot].sensor.addr)"
                                       @input="onNameChange('temp', mergedSlotInfo[slot].sensor.addr, $event)"
                                       :placeholder="t.config.namePlaceholder"
                                       @mousedown.stop
                                       draggable="false" />
                                <div class="slot-actions">
                                    <select class="reassign-dropdown"
                                            :value="slot"
                                            @change="reassignSensor(mergedSlotInfo[slot].sensor, parseInt($event.target.value))"
                                            @mousedown.stop
                                            :disabled="!emontxConnected">
                                        <option v-for="s in otherSlots" :key="s" :value="s">T{{ s }}</option>
                                    </select>
                                    <button type="button" class="btn-clear-slot" @click.stop="$emit('clear-temp-slot', slot)" :disabled="!emontxConnected" :title="t.tooltips.btnClearSlot || 'Clear this slot'">✕</button>
                                </div>
                            </template>

                            <!-- Matched, Modified or New Sensor (has found sensor) -->
                            <template v-else-if="mergedSlotInfo[slot].sensor">
                                <div class="input-label">{{ t.config.name }}</div>
                                <input type="text"
                                       class="sensor-name-input"
                                       :value="getChannelName('temp', mergedSlotInfo[slot].sensor.addr)"
                                       @input="onNameChange('temp', mergedSlotInfo[slot].sensor.addr, $event)"
                                       :placeholder="t.config.namePlaceholder"
                                       @mousedown.stop
                                       draggable="false" />
                                <div class="sensor-info">{{ mergedSlotInfo[slot].sensor.addr }}</div>
                                <div v-if="mergedSlotInfo[slot].status === 'new'" class="new-hint">{{ t.config.newSensorHint || 'Click "Save Mapping" to persist' }}</div>
                                <div v-if="mergedSlotInfo[slot].status === 'modified'" class="modified-hint">{{ t.config.modifiedHint || 'Applied - save to persist' }}</div>
                                <div v-if="mergedSlotInfo[slot].status === 'pending'" class="pending-hint">{{ t.config.pendingHint || 'Click "Apply" to send to device' }}</div>
                                <div class="slot-actions">
                                    <select class="reassign-dropdown"
                                            :value="slot"
                                            @change="reassignSensor(mergedSlotInfo[slot].sensor, parseInt($event.target.value))"
                                            @mousedown.stop
                                            :disabled="!emontxConnected">
                                        <option v-for="s in otherSlots" :key="s" :value="s">T{{ s }}</option>
                                    </select>
                                    <button type="button" class="btn-clear-slot" @click.stop="$emit('clear-temp-slot', slot)" :disabled="!emontxConnected" :title="t.tooltips.btnClearSlot || 'Clear this slot'">✕</button>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- No Sensors Message -->
                <div v-if="device.tempSensors.length === 0 && !hasMissingSensors" class="alert alert-info" style="margin-top: 15px;">
                    {{ t.config.noTempSensors }}
                </div>

                <!-- New/Modified Sensors Warning -->
                <div v-if="hasUnsavedMapping" class="alert alert-info" style="margin-top: 15px;">
                    <strong>{{ t.config.unsavedMappingTitle || 'Unsaved changes!' }}</strong>
                    {{ t.config.unsavedMappingWarning || 'Click "Save Mapping" to save sensor assignments to device memory.' }}
                </div>

                <!-- Missing Sensors Warning -->
                <div v-if="hasMissingSensors" class="alert alert-warning" style="margin-top: 15px;">
                    <strong>{{ t.config.missingSensorsWarningTitle || 'Some sensors not found!' }}</strong>
                    {{ t.config.missingSensorsWarning || 'Saved sensors are not detected on the bus. Check connections or clear the slots.' }}
                </div>

                <!-- Unassigned Sensors -->
                <div v-if="unassignedSensors.length > 0" class="unassigned-sensors-section">
                    <h4>{{ t.config.unassignedSensors || 'Unassigned Sensors' }}</h4>
                    <div class="unassigned-sensors-list">
                        <div v-for="(sensor, idx) in unassignedSensors" :key="'unassigned-'+idx"
                             class="unassigned-sensor-item"
                             draggable="true"
                             @dragstart="handleDragStart(sensor, $event)"
                             @dragend="handleDragEnd">
                            <span class="sensor-index">#{{ idx + 1 }}</span>
                            <span class="sensor-addr">{{ sensor.addr }}</span>
                            <select class="assign-dropdown"
                                    @change="reassignSensor(sensor, parseInt($event.target.value)); $event.target.value = ''"
                                    @mousedown.stop
                                    :disabled="!emontxConnected">
                                <option value="">{{ t.config.assignToSlot || 'Assign to...' }}</option>
                                <option v-for="s in otherSlots" :key="s" :value="s">T{{ s }}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Help text -->
                <p v-if="device.tempSensors.length > 0 || hasMissingSensors" style="font-size: 12px; color: #888; margin-top: 15px;">
                    {{ t.config.tempSlotsHelp || 'Drag sensors between slots or use the dropdown to reassign. Click "Save Mapping" to persist changes.' }}
                </p>
            </div>
        </div>
    `
});
