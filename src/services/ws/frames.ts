/**
 * @module services/ws/frames
 *
 * Type definitions for all JSON frames sent by JotaOrchestrator over the
 * WebSocket connection (`/ws/chat/{user_id}`).
 *
 * The WebSocket stream carries two kinds of messages:
 * 1. **Plain text tokens** — fragments of the AI response, delivered as-is.
 * 2. **JSON frames** — structured control messages with a `type` discriminant.
 *
 * All JSON frames extend `WsFrame`. Consumers should use `parseFrame()` to
 * safely attempt JSON parsing before falling back to token handling.
 */

/** Base shape for all structured WebSocket frames. */
export interface WsFrame {
    /** Discriminant field used for type-narrowing. */
    type: string;
    [key: string]: unknown;
}

/**
 * Signals that the current inference response is complete.
 * May carry the `model_id` used for response traceability.
 */
export interface EndFrame extends WsFrame {
    type: "end";
    /**
     * ID of the model that generated the response.
     * Available for displaying traceability badges on assistant messages.
     */
    model_id?: string;
}

/**
 * A reasoning / chain-of-thought block generated before the main response.
 * Should be rendered in a collapsible UI element, separate from the response.
 */
export interface ThoughtFrame extends WsFrame {
    type: "thought";
    /** The full text of the reasoning block. */
    content: string;
}

/**
 * A server-side application error.
 * The `code` field is machine-readable; `message` is human-readable.
 *
 * Known codes:
 * - `"ERROR_INFERENCE_IN_PROGRESS"` — another inference is running; the UI
 *   should revert the model selector to the previous value.
 */
export interface ErrorFrame extends WsFrame {
    type: "error";
    /** Machine-readable error code. */
    code?: string;
    /** Human-readable error description. */
    message?: string;
}

/**
 * Sent by the backend when the InferenceEngine needs to load model weights
 * into VRAM before inference can start. The UI should show a distinct
 * "loading model" indicator during this phase.
 */
export interface ModelLoadingFrame extends WsFrame {
    type: "model_loading";
}

/** Union of all known frame types, for exhaustive switch/case dispatch. */
export type KnownFrame = EndFrame | ThoughtFrame | ErrorFrame | ModelLoadingFrame;

/**
 * Attempts to parse a WebSocket message as a JSON frame.
 *
 * @param text Raw WebSocket message text.
 * @returns A `WsFrame` object if the text is valid JSON starting with `{`,
 *          or `null` if it is a plain text token or invalid JSON.
 */
export function parseFrame(text: string): WsFrame | null {
    if (!text.trimStart().startsWith("{")) return null;
    try { return JSON.parse(text) as WsFrame; }
    catch { return null; }
}
