/**
 * api/index.ts — Facade + barrel for the REST API layer.
 *
 * Consumers import from here:
 *   import { JotaApiService } from "../services/api";
 *   import type { ModelInfo } from "../services/api";
 */

import { HttpClient } from "./HttpClient";
import { ModelsApi } from "./ModelsApi";
import { ConversationsApi } from "./ConversationsApi";
import { HealthApi } from "./HealthApi";

export type { ModelInfo, Conversation, ChatMessage, HealthStatus } from "../types";
export { HttpClient } from "./HttpClient";
export { ModelsApi } from "./ModelsApi";
export { ConversationsApi } from "./ConversationsApi";
export { HealthApi } from "./HealthApi";

/**
 * JotaApiService: single entry-point for all REST API calls.
 * Composes the three domain APIs onto a shared HttpClient.
 */
export class JotaApiService {
    public readonly models: ModelsApi;
    public readonly conversations: ConversationsApi;
    public readonly health: HealthApi;

    constructor(baseUrl: string, clientKey: string) {
        const http = new HttpClient(baseUrl, clientKey);
        this.models = new ModelsApi(http);
        this.conversations = new ConversationsApi(http);
        this.health = new HealthApi(baseUrl);
    }
}
