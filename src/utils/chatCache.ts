interface CachedResponse {
    response: string;
    timestamp: number;
    version: string;
}

const CACHE_VERSION = 'v3'; // Incremented to invalidate bad fallback cache
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const CACHE_KEY_PREFIX = 'chatbot_cache_';

export const getCachedResponse = (query: string): string | null => {
    try {
        const cacheKey = `${CACHE_KEY_PREFIX}${query.toLowerCase().trim()}`;
        const cached = localStorage.getItem(cacheKey);

        if (!cached) return null;

        const { response, timestamp, version }: CachedResponse = JSON.parse(cached);

        // Check if cache is still valid
        if (version !== CACHE_VERSION) {
            localStorage.removeItem(cacheKey);
            return null;
        }

        if (Date.now() - timestamp > CACHE_DURATION) {
            localStorage.removeItem(cacheKey);
            return null;
        }

        console.log('💾 Cache hit for:', query);
        return response;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
};

export const setCachedResponse = (query: string, response: string): void => {
    try {
        const cacheKey = `${CACHE_KEY_PREFIX}${query.toLowerCase().trim()}`;
        const cached: CachedResponse = {
            response,
            timestamp: Date.now(),
            version: CACHE_VERSION,
        };

        localStorage.setItem(cacheKey, JSON.stringify(cached));
        console.log('💾 Cached response for:', query);
    } catch (error) {
        console.error('Cache write error:', error);
    }
};

export const clearChatbotCache = (): void => {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        console.log('💾 Cache cleared');
    } catch (error) {
        console.error('Cache clear error:', error);
    }
};
