import type { HealthStatus } from "../types";

/**
 * HealthApi: calls the public /health endpoint (no auth required).
 * Useful for polling connection status without opening a WebSocket.
 */
export class HealthApi {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
    }

    async getHealth(): Promise<HealthStatus | null> {
        try {
            const res = await fetch(`${this.baseUrl}/health`);
            if (!res.ok) return null;
            return res.json() as Promise<HealthStatus>;
        } catch {
            return null;
        }
    }

    async isAlive(): Promise<boolean> {
        const health = await this.getHealth();
        return health?.status === "ok";
    }
}
