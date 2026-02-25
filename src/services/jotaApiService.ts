import { JotaService } from "./jotaService";

export interface Conversation {
    id: string;
    title?: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at: string;
}

export class JotaApiService {
    private baseUrl: string;
    private clientKey: string;

    constructor(baseUrl?: string, clientKey?: string) {
        this.baseUrl = baseUrl ? baseUrl.replace(/\/$/, "") : "";
        this.clientKey = clientKey || "jota_desktop_vPucN40NDDBkQkTt"; // Use env var ideally
    }

    private getBaseUrl(): string {
        if (this.baseUrl) return this.baseUrl;

        // Try to read from DOM if running in browser
        if (typeof document !== 'undefined') {
            const container = document.querySelector(".chat-container") as HTMLElement;
            if (container && container.dataset.apiUrl) {
                this.baseUrl = container.dataset.apiUrl.replace(/\/$/, "");
                return this.baseUrl;
            }
        }

        return "http://green-house.local/api/jota";
    }

    async getConversations(userId: string, limit: number = 10): Promise<Conversation[]> {
        try {
            const baseUrl = this.getBaseUrl();
            const url = new URL(`${baseUrl}/chat/conversations/${userId}`);
            url.searchParams.append("client_key", this.clientKey);
            url.searchParams.append("limit", limit.toString());

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === "success") {
                return data.conversations || [];
            } else {
                console.error("[JotaApiService] Failed to fetch conversations:", data.message);
                return [];
            }
        } catch (e) {
            console.error("[JotaApiService] Error fetching conversations:", e);
            return [];
        }
    }

    async getMessages(userId: string, conversationId: string, limit: number = 50): Promise<ChatMessage[]> {
        try {
            const baseUrl = this.getBaseUrl();
            const url = new URL(`${baseUrl}/chat/conversations/${userId}/${conversationId}/messages`);
            url.searchParams.append("client_key", this.clientKey);
            url.searchParams.append("limit", limit.toString());

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === "success") {
                return data.messages || [];
            } else {
                console.error("[JotaApiService] Failed to fetch messages:", data.message);
                return [];
            }
        } catch (e) {
            console.error("[JotaApiService] Error fetching messages:", e);
            return [];
        }
    }
}

export const apiService = new JotaApiService();
