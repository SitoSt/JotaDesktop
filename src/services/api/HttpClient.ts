/**
 * @module services/api/HttpClient
 *
 * Thin, authenticated fetch wrapper shared by all REST API classes.
 *
 * Responsibilities:
 * - Builds the full URL from `baseUrl + path`
 * - Attaches `x-client-key` auth header to every request
 * - Provides typed helpers for GET, PATCH, POST
 * - Throws on non-2xx so callers can catch uniformly
 *
 * Usage:
 * ```ts
 * const http = new HttpClient("http://green-house.local/api/jota", clientKey);
 * const data = await http.get<MyType>("/chat/models");
 * ```
 */
export class HttpClient {
    private readonly baseUrl: string;
    private readonly clientKey: string;

    constructor(baseUrl: string, clientKey: string) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.clientKey = clientKey;
    }

    // ── Header builders ────────────────────────────────────────────────────────

    /** Returns headers for all authenticated requests. */
    private authHeaders(): Record<string, string> {
        return { "x-client-key": this.clientKey };
    }

    /** Returns headers for JSON-body requests. */
    private jsonHeaders(): Record<string, string> {
        return { ...this.authHeaders(), "Content-Type": "application/json" };
    }

    // ── HTTP verbs ─────────────────────────────────────────────────────────────

    /**
     * Authenticated GET with optional query parameters.
     * @param path  URL path relative to `baseUrl` (e.g. `"/chat/models"`).
     * @param params Key-value pairs appended as query string.
     * @throws On non-2xx HTTP status.
     */
    async get<T>(path: string, params?: Record<string, string>): Promise<T> {
        const url = new URL(`${this.baseUrl}${path}`);
        if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const res = await fetch(url.toString(), { headers: this.authHeaders() });
        if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
        return res.json() as Promise<T>;
    }

    /**
     * Unauthenticated GET — for public endpoints like `/health`.
     * @param path URL path relative to `baseUrl`.
     * @throws On non-2xx HTTP status.
     */
    async getPublic<T>(path: string): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`);
        if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
        return res.json() as Promise<T>;
    }

    /**
     * Authenticated PATCH with a JSON body.
     * @param path URL path relative to `baseUrl`.
     * @param body Object serialised as JSON.
     * @throws On non-2xx HTTP status.
     */
    async patch<T>(path: string, body: unknown): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: "PATCH",
            headers: this.jsonHeaders(),
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`PATCH ${path} → HTTP ${res.status}`);
        return res.json() as Promise<T>;
    }

    /**
     * Authenticated POST with a JSON body.
     * @param path URL path relative to `baseUrl`.
     * @param body Object serialised as JSON.
     * @throws On non-2xx HTTP status.
     */
    async post<T>(path: string, body: unknown): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: this.jsonHeaders(),
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`POST ${path} → HTTP ${res.status}`);
        return res.json() as Promise<T>;
    }
}
