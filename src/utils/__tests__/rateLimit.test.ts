import { describe, it, expect, beforeEach } from 'vitest';
import { chatRateLimiter, contactRateLimiter, getSessionId } from '../rateLimit';

describe('RateLimiter', () => {
    beforeEach(() => {
        // Clear rate limiters before each test
        chatRateLimiter.resetAll();
        contactRateLimiter.resetAll();
        // Clear localStorage
        localStorage.clear();
    });

    describe('canMakeRequest', () => {
        it('should allow requests within limit', () => {
            const key = 'test-user';

            // Should allow first 10 requests
            for (let i = 0; i < 10; i++) {
                expect(chatRateLimiter.canMakeRequest(key, 10, 60000)).toBe(true);
            }
        });

        it('should block requests exceeding limit', () => {
            const key = 'test-user';

            // Fill up the limit
            for (let i = 0; i < 10; i++) {
                chatRateLimiter.canMakeRequest(key, 10, 60000);
            }

            // Next request should be blocked
            expect(chatRateLimiter.canMakeRequest(key, 10, 60000)).toBe(false);
        });

        it('should allow requests after window expires', () => {
            const key = 'test-user';
            const shortWindow = 100; // 100ms window for testing

            // Make a request
            expect(chatRateLimiter.canMakeRequest(key, 1, shortWindow)).toBe(true);

            // Should be blocked immediately
            expect(chatRateLimiter.canMakeRequest(key, 1, shortWindow)).toBe(false);

            // Wait for window to expire
            return new Promise(resolve => {
                setTimeout(() => {
                    // Should be allowed again
                    expect(chatRateLimiter.canMakeRequest(key, 1, shortWindow)).toBe(true);
                    resolve(undefined);
                }, 150);
            });
        });

        it('should track different keys separately', () => {
            const key1 = 'user1';
            const key2 = 'user2';

            chatRateLimiter.canMakeRequest(key1, 1, 60000);

            // key1 should be blocked
            expect(chatRateLimiter.canMakeRequest(key1, 1, 60000)).toBe(false);

            // key2 should still be allowed
            expect(chatRateLimiter.canMakeRequest(key2, 1, 60000)).toBe(true);
        });
    });

    describe('getRemainingRequests', () => {
        it('should return max requests for new key', () => {
            const key = 'new-user';
            expect(chatRateLimiter.getRemainingRequests(key, 10, 60000)).toBe(10);
        });

        it('should decrement remaining requests', () => {
            const key = 'test-user';

            chatRateLimiter.canMakeRequest(key, 10, 60000);
            expect(chatRateLimiter.getRemainingRequests(key, 10, 60000)).toBe(9);

            chatRateLimiter.canMakeRequest(key, 10, 60000);
            expect(chatRateLimiter.getRemainingRequests(key, 10, 60000)).toBe(8);
        });

        it('should return 0 when limit reached', () => {
            const key = 'test-user';

            for (let i = 0; i < 10; i++) {
                chatRateLimiter.canMakeRequest(key, 10, 60000);
            }

            expect(chatRateLimiter.getRemainingRequests(key, 10, 60000)).toBe(0);
        });
    });

    describe('getTimeUntilReset', () => {
        it('should return 0 for new key', () => {
            const key = 'new-user';
            expect(chatRateLimiter.getTimeUntilReset(key, 60000)).toBe(0);
        });

        it('should return time remaining in window', () => {
            const key = 'test-user';
            const windowMs = 60000; // 1 minute

            chatRateLimiter.canMakeRequest(key, 10, windowMs);

            const timeUntilReset = chatRateLimiter.getTimeUntilReset(key, windowMs);

            // Should be close to 60 seconds (allowing for execution time)
            expect(timeUntilReset).toBeGreaterThan(55);
            expect(timeUntilReset).toBeLessThanOrEqual(60);
        });
    });

    describe('reset', () => {
        it('should clear rate limit for specific key', () => {
            const key = 'test-user';

            // Fill up limit
            for (let i = 0; i < 10; i++) {
                chatRateLimiter.canMakeRequest(key, 10, 60000);
            }

            // Should be blocked
            expect(chatRateLimiter.canMakeRequest(key, 10, 60000)).toBe(false);

            // Reset
            chatRateLimiter.reset(key);

            // Should be allowed again
            expect(chatRateLimiter.canMakeRequest(key, 10, 60000)).toBe(true);
        });
    });

    describe('resetAll', () => {
        it('should clear all rate limits', () => {
            const key1 = 'user1';
            const key2 = 'user2';

            // Block both users
            chatRateLimiter.canMakeRequest(key1, 1, 60000);
            chatRateLimiter.canMakeRequest(key2, 1, 60000);

            expect(chatRateLimiter.canMakeRequest(key1, 1, 60000)).toBe(false);
            expect(chatRateLimiter.canMakeRequest(key2, 1, 60000)).toBe(false);

            // Reset all
            chatRateLimiter.resetAll();

            // Both should be allowed
            expect(chatRateLimiter.canMakeRequest(key1, 1, 60000)).toBe(true);
            expect(chatRateLimiter.canMakeRequest(key2, 1, 60000)).toBe(true);
        });
    });
});

describe('getSessionId', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should generate session ID if not exists', () => {
        const sessionId = getSessionId();
        expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should return same session ID on subsequent calls', () => {
        const sessionId1 = getSessionId();
        const sessionId2 = getSessionId();
        expect(sessionId1).toBe(sessionId2);
    });

    it('should store session ID in localStorage', () => {
        const sessionId = getSessionId();
        const stored = localStorage.getItem('sessionId');
        expect(stored).toBe(sessionId);
    });

    it('should retrieve existing session ID from localStorage', () => {
        const testId = 'session_test_123';
        localStorage.setItem('sessionId', testId);

        const sessionId = getSessionId();
        expect(sessionId).toBe(testId);
    });
});

describe('Separate rate limiter instances', () => {
    beforeEach(() => {
        chatRateLimiter.resetAll();
        contactRateLimiter.resetAll();
    });

    it('should maintain separate limits for chat and contact', () => {
        const key = 'test-user';

        // Fill chat limiter
        for (let i = 0; i < 10; i++) {
            chatRateLimiter.canMakeRequest(key, 10, 60000);
        }

        // Chat should be blocked
        expect(chatRateLimiter.canMakeRequest(key, 10, 60000)).toBe(false);

        // Contact should still be allowed (separate instance)
        expect(contactRateLimiter.canMakeRequest(key, 3, 300000)).toBe(true);
    });
});
