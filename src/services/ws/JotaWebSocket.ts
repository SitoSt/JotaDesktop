/**
 * @module services/ws/JotaWebSocket
 *
 * Manages the persistent WebSocket connection to JotaOrchestrator.
 *
 * Endpoint: `ws(s)://host/ws/{user_id}`
 *
 * Features:
 * - Authentication via `x_client_key` query parameter (browser can't set custom
 *   headers on WebSocket open, so the key goes in the URL)
 * - Automatic URL derivation from the HTTP base URL (no hardcoded host)
 * - JSON frame dispatch: `end`, `thought`, `error`, `model_loading`
 * - Exponential back-off reconnection (up to 5 attempts, max 30s delay)
 * - All lifecycle events surfaced via callbacks — zero console.log spam
 *
 * @example
 * ```ts
 * const ws = new JotaWebSocket("user123", "http://green-house.local/api/jota");
 * ws.setClientKey("my-client-key");
 * ws.setConversationId("conv-uuid");
 * ws.setCallbacks({
 *   onOpen:  () => console.log("connected"),
 *   onToken: (t) => appendToken(t),
 *   onEnd:   (modelId) => showBadge(modelId),
 * });
 * ws.connect();
 * ```
 */

import type { WsCallbacks } from "../types";
import { parseFrame } from "./frames";
import type { EndFrame, ThoughtFrame, ErrorFrame } from "./frames";

export class JotaWebSocket {
    private ws: WebSocket | null = null;
    private readonly decoder: TextDecoder = new TextDecoder("utf-8");

    private userId: string;
    /** HTTP base URL — WS URL is derived at connect time via http→ws replacement. */
    private baseUrl: string;
    private clientKey: string = "";

    /** ID of the conversation to resume, or null to start a new one. */
    public conversationId: string | null = null;
    private selectedModelId: string | null = null;

    private callbacks: WsCallbacks = {};

    // ── Reconnection state ─────────────────────────────────────────────────────
    private attempts = 0;
    private readonly maxAttempts = 5;
    private readonly baseDelay = 1_000; // ms
    private reconnectTimer: number | null = null;
    private intentionalClose = false;

    /**
     * @param userId      The user ID used in the WebSocket URL path.
     * @param httpBaseUrl The HTTP base URL of the Orchestrator API
     *                    (e.g. `"http://green-house.local/api/jota"`).
     *                    The WS URL is derived automatically.
     */
    constructor(userId: string, httpBaseUrl: string) {
        this.userId = userId;
        this.baseUrl = httpBaseUrl.replace(/\/$/, "");
    }

    // ── Configuration ──────────────────────────────────────────────────────────

    /** Sets the client authentication key sent as `x_client_key` query param. */
    setClientKey(key: string) { this.clientKey = key; }

    /** Sets the AI model ID for the next connection. */
    setModelId(id: string | null) { this.selectedModelId = id; }

    /** Sets the conversation to resume. Pass `null` to start a new conversation. */
    setConversationId(id: string | null) { this.conversationId = id; }

    /** Registers all event callbacks in one call. */
    setCallbacks(cb: WsCallbacks) { this.callbacks = cb; }

    /** `true` when the underlying WebSocket is in `OPEN` state. */
    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Opens the WebSocket connection.
     * Any existing connection is cleanly torn down first.
     * Reconnection attempts are reset on successful open.
     */
    connect() {
        this._teardown(false);
        this.intentionalClose = false;

        const params = new URLSearchParams();
        if (this.conversationId) params.set("conversation_id", this.conversationId);
        if (this.selectedModelId) params.set("model_id", this.selectedModelId);
        if (this.clientKey) params.set("x_client_key", this.clientKey);

        // Derive WS URL from HTTP base — no hardcoded host
        const wsBase = this.baseUrl.replace(/^http/, "ws");
        const url = `${wsBase}/ws/${encodeURIComponent(this.userId)}?${params}`;

        try {
            this.ws = new WebSocket(url);
            this.ws.binaryType = "arraybuffer";
        } catch {
            this._scheduleReconnect();
            return;
        }

        this.ws.onopen = () => this._onOpen();
        this.ws.onmessage = (e) => this._onMessage(e);
        this.ws.onerror = (e) => this.callbacks.onError?.(e);
        this.ws.onclose = (e) => this._onClose(e);
    }

    /**
     * Sends a plain-text message to the Orchestrator.
     * No-ops with a console.warn if the socket is not open.
     */
    sendMessage(text: string) {
        if (this.isConnected) {
            this.ws!.send(text);
        } else {
            console.warn("[JotaWebSocket] Cannot send — socket not open.");
        }
    }

    /**
     * Closes the WebSocket connection.
     * @param intentional If `true` (default), suppresses reconnection and fires `onClose`.
     */
    disconnect(intentional = true) {
        this.intentionalClose = intentional;
        this._teardown(intentional);
    }

    // ── Private event handlers ─────────────────────────────────────────────────

    private _onOpen() {
        this.attempts = 0;
        this.callbacks.onOpen?.();
    }

    private _onMessage(event: MessageEvent) {
        const text =
            event.data instanceof ArrayBuffer
                ? this.decoder.decode(event.data, { stream: true })
                : typeof event.data === "string"
                    ? event.data
                    : null;

        if (text === null) return;

        // Attempt JSON frame dispatch first; fall back to plain token
        const frame = parseFrame(text);
        if (frame) {
            this._dispatchFrame(frame.type, frame as any);
        } else if (text) {
            this.callbacks.onToken?.(text);
        }
    }

    private _onClose(event: CloseEvent) {
        this.callbacks.onClose?.();
        if (this.intentionalClose) return;

        if (event.code === 4001) {
            // Auth rejected — do not attempt reconnection
            this.callbacks.onModelError?.(
                "AUTH_FAILED",
                "Autenticación rechazada. Comprueba tu client key.",
            );
            return;
        }

        this._scheduleReconnect();
    }

    // ── Frame dispatcher ───────────────────────────────────────────────────────

    private _dispatchFrame(type: string, frame: any) {
        switch (type) {
            case "end":
                this.callbacks.onEnd?.((frame as EndFrame).model_id);
                break;
            case "thought":
                this.callbacks.onThought?.((frame as ThoughtFrame).content ?? "");
                break;
            case "model_loading":
                this.callbacks.onModelLoading?.();
                break;
            case "error": {
                const f = frame as ErrorFrame;
                this.callbacks.onModelError?.(
                    f.code ?? "UNKNOWN_ERROR",
                    f.message ?? "Unknown error",
                );
                break;
            }
            default:
                // Unknown frames are silently ignored for forward-compatibility
                break;
        }
    }

    // ── Reconnection ───────────────────────────────────────────────────────────

    /**
     * Schedules the next reconnection attempt using exponential back-off
     * with jitter (capped at 30s). When the limit is reached, fires
     * `onModelError` with code `"MAX_RECONNECT_REACHED"` — no console spam.
     */
    private _scheduleReconnect() {
        if (this.attempts >= this.maxAttempts) {
            this.callbacks.onModelError?.(
                "MAX_RECONNECT_REACHED",
                "No se pudo restablecer la conexión con el servidor.",
            );
            return;
        }

        const delay =
            Math.min(this.baseDelay * Math.pow(2, this.attempts), 30_000) +
            Math.random() * 500; // jitter

        this.callbacks.onReconnecting?.(
            this.attempts + 1,
            this.maxAttempts,
            Math.round(delay),
        );

        this.reconnectTimer = setTimeout(() => {
            this.attempts++;
            this.connect();
        }, delay) as unknown as number;
    }

    // ── Teardown ───────────────────────────────────────────────────────────────

    /**
     * Cancels any pending reconnect timer, closes the socket, and optionally
     * fires onClose. Nulls out the socket's onclose handler to prevent the
     * built-in handler from triggering a spurious reconnect cycle.
     */
    private _teardown(fireClose: boolean) {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }
        if (fireClose) this.callbacks.onClose?.();
    }
}
