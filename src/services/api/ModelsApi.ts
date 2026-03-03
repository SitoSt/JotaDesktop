import type { HttpClient } from "./HttpClient";
import type { ModelInfo } from "../types";

const CACHE_KEY = "jota_models_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 min — mirrors server-side TTL

interface ModelsCache {
    ts: number;
    models: ModelInfo[];
}

/**
 * ModelsApi: handles `GET /chat/models` with a client-side cache
 * that mirrors the server's 5-minute in-memory TTL.
 */
export class ModelsApi {
    constructor(private readonly http: HttpClient) { }

    async getModels(): Promise<ModelInfo[]> {
        const cached = this.readCache();
        if (cached) return cached;

        try {
            const data = await this.http.get<{ status: string; models?: ModelInfo[] }>(
                "/chat/models",
            );
            const models = data.status === "success" ? (data.models ?? []) : [];
            this.writeCache(models);
            return models;
        } catch (e) {
            console.error("[ModelsApi] getModels failed:", e);
            return [];
        }
    }

    /** Force-invalidate the local cache (e.g. after a server restart) */
    invalidateCache(): void {
        try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    }

    // ── Cache helpers ──────────────────────────────────────────────────────────

    private readCache(): ModelInfo[] | null {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const { ts, models }: ModelsCache = JSON.parse(raw);
            return Date.now() - ts < CACHE_TTL ? models : null;
        } catch {
            return null;
        }
    }

    private writeCache(models: ModelInfo[]): void {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), models }));
        } catch { /* ignore storage errors */ }
    }
}
