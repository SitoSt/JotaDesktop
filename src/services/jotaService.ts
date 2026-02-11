export type MessageSender = 'user' | 'bot' | 'system';

export interface ChatMessage {
    text: string;
    sender: MessageSender;
}

type TokenCallback = (token: string) => void;
type ErrorCallback = (error: Event) => void;
type CloseCallback = () => void;
type OpenCallback = () => void;

export class JotaService {
    private ws: WebSocket | null = null;
    private userId: string;
    private baseUrl: string;
    private onToken: TokenCallback | null = null;
    private onError: ErrorCallback | null = null;
    private onClose: CloseCallback | null = null;
    private onOpen: OpenCallback | null = null;

    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private baseReconnectDelay = 1000;
    private reconnectTimer: number | null = null;
    private isIntentionalClose = false;

    private decoder = new TextDecoder("utf-8");

    constructor(userId: string, baseUrl: string = "ws://green-house.local/api/jota") {
        this.userId = userId;
        this.baseUrl = baseUrl;
    }

    public connect() {
        this.disconnect(false); // Clean up but don't flag as intentional disconnect yet (resetting purpose)
        this.isIntentionalClose = false;

        const wsUrl = `${this.baseUrl}/ws/chat/${this.userId}`;
        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = "arraybuffer"; // Receive binary to handle UTF-8 stream manually

        this.ws.onopen = () => {
            console.log('Connected to Jota Orchestrator');
            this.reconnectAttempts = 0; // Reset attempts on success
            if (this.onOpen) this.onOpen();
        };

        this.ws.onmessage = (event) => {
            // Decode stream safely (handles split UTF-8 characters)
            if (event.data instanceof ArrayBuffer) {
                const text = this.decoder.decode(event.data, { stream: true });
                if (text && this.onToken) this.onToken(text);
            } else if (typeof event.data === "string") {
                // Fallback if backend sends text frames
                if (this.onToken) this.onToken(event.data);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
            if (this.onError) this.onError(error);
        };

        this.ws.onclose = (event) => {
            console.log(`Disconnected. Code: ${event.code}, Reason: ${event.reason}`);

            if (this.onClose) this.onClose();

            if (this.isIntentionalClose) return;

            // Handle Unauthorized (4001) - Do not reconnect
            if (event.code === 4001) {
                console.error("Connection unauthorized (4001). Stopping reconnection.");
                return;
            }

            this.handleReconnection();
        };
    }

    private handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("Max reconnect attempts reached.");
            return;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
            this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
            30000 // Cap at 30 seconds
        ) + (Math.random() * 500); // Add jitter

        console.log(`Reconnecting in ${Math.round(delay)}ms... (Attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay) as unknown as number;
    }

    public disconnect(intentional = true) {
        this.isIntentionalClose = intentional;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            // Prevent onclose firing reconnection logic if we manually close
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }

        // If we just want to close the socket but keep the object alive (e.g. for reconnect), 
        // we might want to trigger `onClose`. But `disconnect()` usually implies user action.
        if (intentional && this.onClose) {
            this.onClose();
        }
    }

    public sendMessage(text: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(text);
        } else {
            console.warn('WebSocket is not open. Cannot send message.');
        }
    }

    public setCallbacks(callbacks: {
        onToken?: TokenCallback;
        onError?: ErrorCallback;
        onClose?: CloseCallback;
        onOpen?: OpenCallback;
    }) {
        this.onToken = callbacks.onToken || null;
        this.onError = callbacks.onError || null;
        this.onClose = callbacks.onClose || null;
        this.onOpen = callbacks.onOpen || null;
    }
}
