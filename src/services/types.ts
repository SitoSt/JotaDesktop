/**
 * @module services/types
 *
 * Single source of truth for all TypeScript interfaces and callback types
 * shared across the JotaDesktop services layer.
 *
 * Import from here rather than from individual service files:
 * ```ts
 * import type { ModelInfo, Conversation, WsCallbacks } from "../services/types";
 * ```
 */

// ─── REST API response types ─────────────────────────────────────────────────────

/**
 * Result of `GET /health`.
 * Reports whether the Orchestrator's internal dependencies are reachable.
 */
export interface HealthStatus {
    /** `"ok"` when all components are connected; `"degraded"` when at least one is down. */
    status: "ok" | "degraded";
    components: {
        /** Whether the internal WebSocket to the InferenceEngine is `OPEN`. */
        inference_engine: "connected" | "disconnected";
        /** Whether JotaDB is reachable. */
        jota_db: "connected" | "disconnected";
    };
}

/**
 * A single AI model available in the InferenceCenter.
 * Shape returned by `GET /chat/models`.
 */
export interface ModelInfo {
    /** Unique identifier used in WebSocket and PATCH requests (e.g. `"llama-3-8b-instruct"`). */
    id: string;
    /** Human-readable name (e.g. `"Llama 3 8B Instruct"`). */
    name: string;
    /** Parameter count label, e.g. `"8B"`. */
    size?: string;
    /** Model file format, e.g. `"gguf"`. */
    format?: string;
    /** Optional description provided by the InferenceCenter. */
    description?: string;
}

/**
 * A user conversation record.
 * Shape returned inside the `conversations` array of `GET /chat/conversations/{user_id}`.
 */
export interface Conversation {
    /** UUID of the conversation. */
    id: string;
    user_id?: string;
    /** Optional human-readable title (may be absent for new conversations). */
    title?: string;
    status?: string;
    /** ID of the AI model currently assigned to this conversation. */
    model_id?: string;
    created_at: string;
    updated_at: string;
}

/**
 * A single chat message.
 * Shape returned inside the `messages` array of
 * `GET /chat/conversations/{user_id}/{conversation_id}/messages`.
 */
export interface ChatMessage {
    /** UUID of the message. */
    id: string;
    conversation_id?: string;
    /** Who sent the message. */
    role: "user" | "assistant" | "system";
    /** Full text content. */
    content: string;
    created_at: string;
    /**
     * Server-set metadata. For assistant messages, `metadata.model_id` identifies
     * which AI model generated the response (traceability).
     */
    metadata?: {
        model_id?: string;
        [key: string]: unknown;
    };
}

// ─── WebSocket callback types ─────────────────────────────────────────────────────

/** Fired for each plain-text token received from the inference stream. */
export type TokenCallback = (token: string) => void;

/** Fired on a native WebSocket error event. */
export type WsErrorCallback = (error: Event) => void;

/** Fired when the WebSocket connection closes (intentional or not). */
export type CloseCallback = () => void;

/** Fired when the WebSocket connection is successfully opened. */
export type OpenCallback = () => void;

/**
 * Fired when the backend sends a `{"type":"model_loading"}` frame,
 * indicating the InferenceEngine is loading model weights into VRAM.
 * The UI should show a distinct "loading" indicator during this time.
 */
export type ModelLoadingCallback = () => void;

/**
 * Fired when the backend sends a `{"type":"error"}` frame, or when
 * the reconnection limit is reached.
 *
 * @param code   Machine-readable error code (e.g. `"AUTH_FAILED"`, `"MAX_RECONNECT_REACHED"`).
 * @param message Human-readable description.
 */
export type ModelErrorCallback = (code: string, message: string) => void;

/**
 * Fired when the backend sends a `{"type":"end"}` frame, signaling that
 * the current inference response is complete.
 *
 * @param modelId The model that generated the response, for traceability.
 */
export type EndCallback = (modelId?: string) => void;

/**
 * Fired when the backend sends a `{"type":"thought"}` frame containing
 * a chain-of-thought or reasoning block. Should be rendered separately
 * (e.g. in a collapsible `<details>` element) from the main response.
 */
export type ThoughtCallback = (thought: string) => void;

/**
 * Fired each time a reconnection attempt is scheduled (exponential back-off).
 * Designed to drive the `ConnectionStatus` UI indicator without any console spam.
 *
 * @param attempt    Current attempt number (1-based).
 * @param maxAttempts Maximum number of attempts before giving up.
 * @param delayMs    Milliseconds until the next connection attempt.
 */
export type ReconnectingCallback = (
    attempt: number,
    maxAttempts: number,
    delayMs: number,
) => void;

/**
 * All WebSocket lifecycle and data callbacks in a single object,
 * passed to `JotaWebSocket.setCallbacks()`.
 */
export interface WsCallbacks {
    onToken?: TokenCallback;
    onError?: WsErrorCallback;
    onClose?: CloseCallback;
    onOpen?: OpenCallback;
    onModelLoading?: ModelLoadingCallback;
    onModelError?: ModelErrorCallback;
    onEnd?: EndCallback;
    onThought?: ThoughtCallback;
    onReconnecting?: ReconnectingCallback;
}
