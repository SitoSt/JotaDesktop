/** ws/index.ts — barrel for the WebSocket layer */

export { JotaWebSocket } from "./JotaWebSocket";
export { parseFrame } from "./frames";
export type { WsFrame, EndFrame, ThoughtFrame, ErrorFrame, ModelLoadingFrame, KnownFrame } from "./frames";
