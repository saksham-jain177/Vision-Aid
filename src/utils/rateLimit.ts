/**
 * Client-side rate limiting to prevent API abuse
 */

interface RateLimitEntry {
    timestamps: number[];
}

class RateLimiter {
    private requests: Map<string, RateLimitEntry> = new Map();

    /**
     * Check if a request can be made within the rate limit
     * @param key - Unique identifier (e.g., user session ID)
     * @param maxRequests - Maximum number of requests allowed
     * @param windowMs - Time window in milliseconds
     * @returns true if request is allowed, false if rate limited
     */
    canMakeRequest(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
        const now = Date.now();
        const entry = this.requests.get(key) || { timestamps: [] };

        // Filter out timestamps outside the current window
        entry.timestamps = entry.timestamps.filter(timestamp => now - timestamp < windowMs);

        // Check if limit exceeded
        if (entry.timestamps.length >= maxRequests) {
            return false;
        }

        // Add current timestamp
        entry.timestamps.push(now);
        this.requests.set(key, entry);

        return true;
    }

    /**
     * Get remaining requests in current window
     */
    getRemainingRequests(key: string, maxRequests: number = 10, windowMs: number = 60000): number {
        const now = Date.now();
        const entry = this.requests.get(key);

        if (!entry) {
            return maxRequests;
        }

        const validTimestamps = entry.timestamps.filter(timestamp => now - timestamp < windowMs);
        return Math.max(0, maxRequests - validTimestamps.length);
    }

    /**
     * Get time until next request is allowed (in seconds)
     */
    getTimeUntilReset(key: string, windowMs: number = 60000): number {
        const entry = this.requests.get(key);

        if (!entry || entry.timestamps.length === 0) {
            return 0;
        }

        const oldestTimestamp = Math.min(...entry.timestamps);
        const resetTime = oldestTimestamp + windowMs;
        const now = Date.now();

        return Math.max(0, Math.ceil((resetTime - now) / 1000));
    }

    /**
     * Clear rate limit for a specific key
     */
    reset(key: string): void {
        this.requests.delete(key);
    }

    /**
     * Clear all rate limits
     */
    resetAll(): void {
        this.requests.clear();
    }
}

// Singleton instance for chatbot
export const chatRateLimiter = new RateLimiter();

// Singleton instance for contact form
export const contactRateLimiter = new RateLimiter();

/**
 * Generate or retrieve session ID from localStorage
 */
export function getSessionId(): string {
    let sessionId = localStorage.getItem('sessionId');

    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        localStorage.setItem('sessionId', sessionId);
    }

    return sessionId;
}
