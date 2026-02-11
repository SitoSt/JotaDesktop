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
    private clientKey: string;
    private onToken: TokenCallback | null = null;
    private onError: ErrorCallback | null = null;
    private onClose: CloseCallback | null = null;
    private onOpen: OpenCallback | null = null;

    constructor(userId: string, clientKey: string) {
        this.userId = userId;
        this.clientKey = clientKey;
    }

    public connect() {
        // Hardcoded URL base as per prompt context, but utilizing the variables.
        // Prompt: ws://green-house.local/api/jota/ws/chat/${userId}?client_key=${clientKey}
        const wsUrl = `ws://green-house.local/api/jota/ws/chat/${this.userId}?client_key=${this.clientKey}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Connected to Jota Orchestrator');
            if (this.onOpen) this.onOpen();
        };

        this.ws.onmessage = (event) => {
            // The backend sends raw text tokens.
            const token = event.data;
            if (this.onToken) this.onToken(token);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
            if (this.onError) this.onError(error);
        };

        this.ws.onclose = () => {
            console.log('Disconnected');
            if (this.onClose) this.onClose();
            // Auto-reconnect logic could go here or be handled by the consumer.
            // The prompt says "Notify UI... without service knowing about DOM".
            // We'll leave reconnection policy to the consumer for now, or simple retry here?
            // "Eventos: Debe usar callbacks... para notificar a la UI".
        };
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
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
