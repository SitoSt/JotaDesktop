import type { HttpClient } from "./HttpClient";
import type { Conversation, ChatMessage } from "../types";

/**
 * ConversationsApi: manages conversations and their messages.
 *
 * Endpoints used:
 *   GET  /chat/conversations/{user_id}
 *   GET  /chat/conversations/{user_id}/{conversation_id}/messages
 *   PATCH /chat/conversations/{conversation_id}
 */
export class ConversationsApi {
    constructor(private readonly http: HttpClient) { }

    async getConversations(userId: string, limit = 50): Promise<Conversation[]> {
        try {
            const data = await this.http.get<{ status: string; conversations?: Conversation[] }>(
                `/chat/conversations/${encodeURIComponent(userId)}`,
                { limit: String(limit) },
            );
            return data.status === "success" ? (data.conversations ?? []) : [];
        } catch (e) {
            console.error("[ConversationsApi] getConversations failed:", e);
            return [];
        }
    }

    async getMessages(
        userId: string,
        conversationId: string,
        limit = 100,
    ): Promise<ChatMessage[]> {
        try {
            const path =
                `/chat/conversations/${encodeURIComponent(userId)}` +
                `/${encodeURIComponent(conversationId)}/messages`;
            const data = await this.http.get<{ status: string; messages?: ChatMessage[] }>(
                path,
                { limit: String(limit) },
            );
            return data.status === "success" ? (data.messages ?? []) : [];
        } catch (e) {
            console.error("[ConversationsApi] getMessages failed:", e);
            return [];
        }
    }

    /**
     * Updates the AI model assigned to a conversation.
     * Returns the confirmed model_id on success, or null on failure.
     */
    async updateModel(conversationId: string, modelId: string): Promise<string | null> {
        try {
            const data = await this.http.patch<{
                status: string;
                model_id?: string;
            }>(
                `/chat/conversations/${encodeURIComponent(conversationId)}`,
                { model_id: modelId },
            );
            return data.status === "success" ? (data.model_id ?? modelId) : null;
        } catch (e) {
            console.error("[ConversationsApi] updateModel failed:", e);
            return null;
        }
    }
}
