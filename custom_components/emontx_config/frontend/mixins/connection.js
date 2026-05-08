/**
 * Connection Mixin
 * Handles Home Assistant WebSocket connection and device discovery
 */
const ConnectionMixin = {
    methods: {
        // Home Assistant connection
        initHassConnection() {
            this.log('Connecting to Home Assistant...', 'info');

            try {
                if (window.parent && window.parent.document) {
                    const hassObj = window.parent.document.querySelector('home-assistant');
                    if (hassObj && hassObj.hass && hassObj.hass.connection) {
                        this.hass = hassObj.hass;
                        this.log('Connected via parent hass object', 'info');
                        this.wsConnected = true;
                        this.subscribeToEvents();
                        this.getDeviceInfo();
                        this.loadChannelNames();
                        return;
                    }
                }
            } catch (e) {
                console.log('Could not get hass from parent:', e);
            }

            this.log('Falling back to WebSocket connection...', 'info');
            this.connectWebSocket();
        },

        connectWebSocket() {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/api/websocket`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.log('WebSocket connected', 'info');
            };

            this.ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                this.handleWsMessage(msg);
            };

            this.ws.onerror = (error) => {
                this.log('WebSocket error', 'error');
                this.wsConnected = false;
            };

            this.ws.onclose = () => {
                this.log('WebSocket closed, reconnecting...', 'error');
                this.wsConnected = false;
                setTimeout(() => this.connectWebSocket(), 5000);
            };
        },

        handleWsMessage(msg) {
            switch (msg.type) {
                case 'auth_required':
                    this.authenticateWebSocket();
                    break;
                case 'auth_ok':
                    this.log('Authenticated with Home Assistant', 'info');
                    this.wsConnected = true;
                    this.subscribeToEvents();
                    this.getDeviceInfo();
                    break;
                case 'auth_invalid':
                    this.log('Authentication failed', 'error');
                    this.wsConnected = false;
                    break;
                case 'result':
                    if (msg.id === this.servicesRequestId && msg.success && msg.result && typeof msg.result === 'object') {
                        this.findEmontxDevice(msg.result);
                    }
                    break;
                case 'event':
                    if (msg.event && msg.event.event_type === 'esphome.emontx_raw') {
                        this.handleEmontxData(msg.event.data);
                    } else if (msg.event && msg.event.event_type === 'esphome.emontx_flash_status') {
                        this.handleFlashStatus(msg.event.data);
                    }
                    break;
            }
        },

        authenticateWebSocket() {
            let token = null;
            try {
                if (window.parent && window.parent.document) {
                    const hassObj = window.parent.document.querySelector('home-assistant');
                    if (hassObj && hassObj.hass && hassObj.hass.auth && hassObj.hass.auth.data) {
                        token = hassObj.hass.auth.data.access_token;
                    }
                }
            } catch (e) {}

            if (token) {
                this.ws.send(JSON.stringify({ type: 'auth', access_token: token }));
            } else {
                this.log('No authentication token available', 'error');
            }
        },

        subscribeToEvents() {
            if (this.hass && this.hass.connection) {
                this.hass.connection.subscribeEvents(
                    (event) => {
                        this.handleEmontxData(event.data);
                    },
                    'esphome.emontx_raw'
                ).catch((err) => {
                    console.error('Failed to subscribe:', err);
                });

                this.hass.connection.subscribeEvents(
                    (event) => {
                        this.handleFlashStatus(event.data);
                    },
                    'esphome.emontx_flash_status'
                ).catch((err) => {
                    console.error('Failed to subscribe to flash status:', err);
                });
            } else if (this.ws) {
                this.ws.send(JSON.stringify({
                    id: this.wsMessageId++,
                    type: 'subscribe_events',
                    event_type: 'esphome.emontx_raw'
                }));
                this.ws.send(JSON.stringify({
                    id: this.wsMessageId++,
                    type: 'subscribe_events',
                    event_type: 'esphome.emontx_flash_status'
                }));
            }
        },

        getDeviceInfo() {
            if (this.hass && this.hass.connection) {
                this.hass.connection.sendMessagePromise({ type: 'get_services' })
                    .then(result => this.findEmontxDevice(result));
            } else if (this.ws) {
                this.servicesRequestId = this.wsMessageId++;
                this.ws.send(JSON.stringify({
                    id: this.servicesRequestId,
                    type: 'get_services'
                }));
            }
        },

        findEmontxDevice(services) {
            if (services.esphome) {
                const serviceName = `${this.selectedDevice}_send_command`;
                if (services.esphome[serviceName]) {
                    this.deviceName = this.selectedDevice;
                    this.log(`Found device: ${this.deviceName}`, 'info');
                    this.emontxConnected = true;
                    this.emontxStatus = 'Connected';
                    setTimeout(() => this.loadConfig(), 1000);
                    return;
                }
            }
            this.log(`Device ${this.selectedDevice} not found`, 'error');
        }
    }
};
