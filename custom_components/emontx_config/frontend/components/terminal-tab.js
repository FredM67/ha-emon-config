/**
 * Terminal Tab Component
 * Serial terminal for direct communication with the emonPi/Tx device
 */
Vue.component('terminal-tab', {
    props: {
        t: Object,
        lang: { type: String, default: 'en' },
        emontxConnected: Boolean,
        hasUnsavedChanges: Boolean,
        // null = unknown (firmware without emonlock support)
        deviceLocked: { type: Boolean, default: null }
    },
    data() {
        return {
            cmdInput: '',
            terminalAutoscroll: true
        };
    },
    mounted() {
        this.restoreTerminalSize();
    },
    methods: {
        sendCmd() {
            if (this.cmdInput.trim()) {
                this.$emit('send-command', this.cmdInput.trim());
                this.cmdInput = '';
            }
        },
        sendQuickCmd(cmd) {
            this.$emit('send-command', cmd);
        },
        copyTerminal(event) {
            const terminal = document.getElementById('terminal');
            if (terminal) {
                const text = terminal.innerText;
                const btn = event.target;
                const originalText = btn.textContent;

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(() => {
                        btn.textContent = this.t.terminal.copied;
                        setTimeout(() => { btn.textContent = originalText; }, 1500);
                    }).catch(() => {
                        this.fallbackCopy(text, btn, originalText);
                    });
                } else {
                    this.fallbackCopy(text, btn, originalText);
                }
            }
        },
        fallbackCopy(text, btn, originalText) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                btn.textContent = this.t.terminal.copied;
                setTimeout(() => { btn.textContent = originalText; }, 1500);
            } catch (e) {
                console.error('Copy failed:', e);
            }
            document.body.removeChild(textarea);
        },
        downloadTerminal() {
            const terminal = document.getElementById('terminal');
            if (terminal) {
                const text = terminal.innerText;
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `emontx-serial-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.log`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        },
        clearTerminal() {
            const terminal = document.getElementById('terminal');
            if (terminal) {
                terminal.innerHTML = '';
            }
        },
        restoreTerminalSize() {
            setTimeout(() => {
                const terminal = document.getElementById('terminal');
                const storage = window.parent.localStorage || localStorage;
                const savedHeight = storage.getItem('emontx_terminal_height');

                if (terminal) {
                    if (savedHeight) {
                        terminal.style.height = savedHeight;
                    }

                    let lastHeight = terminal.offsetHeight;
                    document.addEventListener('mouseup', () => {
                        const currentHeight = terminal.offsetHeight;
                        if (currentHeight !== lastHeight && currentHeight > 100) {
                            lastHeight = currentHeight;
                            storage.setItem('emontx_terminal_height', currentHeight + 'px');
                        }
                    });
                }
            }, 500);
        },
        // Expose method for parent to add log entries
        log(message, type = '') {
            const terminal = document.getElementById('terminal');
            if (terminal) {
                const time = new Date().toLocaleTimeString(this.lang || 'en');
                const line = document.createElement('div');
                line.className = type;
                line.textContent = `[${time}] ${message}`;
                terminal.appendChild(line);
                if (this.terminalAutoscroll) {
                    terminal.scrollTop = terminal.scrollHeight;
                }
            }
        }
    },
    template: `
        <div class="tab-content">
            <!-- Device Locked Banner: any command typed below may be rejected -->
            <lock-banner :t="t" :device-locked="deviceLocked" :emontx-connected="emontxConnected" @unlock-device="$emit('unlock-device')"></lock-banner>

            <!-- Unsaved Changes Warning Banner -->
            <div v-if="hasUnsavedChanges" class="alert alert-danger" style="display: flex; align-items: center; justify-content: space-between;">
                <span><strong>{{ t.unsavedChanges.title }}</strong> {{ t.unsavedChanges.message }}</span>
                <button class="btn btn-warning" @click="$emit('save-config')" :disabled="deviceLocked" :title="deviceLocked ? t.lock.bannerMessage : ''" style="margin-left: 15px;">{{ t.buttons.save }}</button>
            </div>

            <div class="card">
                <div class="card-header">{{ t.terminal.title }}</div>
                <div class="card-body">
                    <div class="terminal-toolbar">
                        <div class="btn-group">
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 13px;">
                                <input type="checkbox" v-model="terminalAutoscroll" style="width: 16px; height: 16px;" />
                                {{ t.terminal.autoscroll }}
                            </label>
                            <button class="btn btn-sm btn-info" @click="copyTerminal($event)">{{ t.terminal.copy }}</button>
                            <button class="btn btn-sm btn-info" @click="downloadTerminal">{{ t.terminal.download }}</button>
                            <button class="btn btn-sm btn-danger" @click="clearTerminal">{{ t.terminal.clear }}</button>
                        </div>
                    </div>
                    <div id="terminal" class="terminal"></div>
                    <div class="command-input">
                        <input type="text" v-model="cmdInput" @keypress.enter="sendCmd" :placeholder="t.terminal.placeholder" autocomplete="off" />
                        <button class="btn btn-primary" @click="sendCmd" :disabled="!emontxConnected">{{ t.terminal.send }}</button>
                    </div>
                    <div style="margin-top: 15px; display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-primary" @click="sendQuickCmd('l')">l - List Config</button>
                        <button class="btn btn-primary" @click="sendQuickCmd('v')">v - Version</button>
                        <button class="btn btn-primary" @click="sendQuickCmd('s')">s - Save</button>
                        <button class="btn btn-primary" @click="sendQuickCmd('?')">? - Help</button>
                        <!-- Lock/unlock go through the parent so the confirm modal and the
                             deviceLocked flag stay in sync with the rest of the panel. -->
                        <button v-if="deviceLocked !== false" class="btn btn-warning" @click="$emit('unlock-device')" :disabled="!emontxConnected">🔓 emonunlock</button>
                        <button v-if="deviceLocked !== true" class="btn" @click="$emit('lock-device')" :disabled="!emontxConnected">🔒 emonlock</button>
                    </div>
                </div>
            </div>
        </div>
    `
});
