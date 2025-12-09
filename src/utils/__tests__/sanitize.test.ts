import { describe, it, expect } from 'vitest';
import {
    sanitizeInput,
    validateEmail,
    validateMessageLength,
    sanitizeChatMessage,
} from '../sanitize';

describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
        const input = '<p>Hello <b>World</b></p>';
        const result = sanitizeInput(input);
        expect(result).toBe('Hello World');
    });

    it('should remove script tags', () => {
        const input = '<script>alert("XSS")</script>Hello';
        const result = sanitizeInput(input);
        expect(result).toBe('Hello');
    });

    it('should handle nested tags', () => {
        const input = '<div><span>Test</span></div>';
        const result = sanitizeInput(input);
        expect(result).toBe('Test');
    });

    it('should trim whitespace', () => {
        const input = '  Hello World  ';
        const result = sanitizeInput(input);
        expect(result).toBe('Hello World');
    });

    it('should handle empty string', () => {
        const result = sanitizeInput('');
        expect(result).toBe('');
    });
});

describe('validateEmail', () => {
    it('should accept valid email', () => {
        expect(validateEmail('test@example.com')).toBe(true);
        expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
        expect(validateEmail('invalid')).toBe(false);
        expect(validateEmail('test@')).toBe(false);
        expect(validateEmail('@example.com')).toBe(false);
        expect(validateEmail('test @example.com')).toBe(false);
    });

    it('should reject email longer than 254 characters', () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        expect(validateEmail(longEmail)).toBe(false);
    });
});

describe('validateMessageLength', () => {
    it('should accept message within limits', () => {
        expect(validateMessageLength('Hello', 1000)).toBe(true);
        expect(validateMessageLength('A'.repeat(500), 1000)).toBe(true);
    });

    it('should reject empty message', () => {
        expect(validateMessageLength('', 1000)).toBe(false);
    });

    it('should reject message exceeding max length', () => {
        expect(validateMessageLength('A'.repeat(1001), 1000)).toBe(false);
    });

    it('should use default max length of 1000', () => {
        expect(validateMessageLength('A'.repeat(999))).toBe(true);
        expect(validateMessageLength('A'.repeat(1001))).toBe(false);
    });
});

describe('sanitizeChatMessage', () => {
    it('should return valid for good message', () => {
        const result = sanitizeChatMessage('Hello there!');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('Hello there!');
        expect(result.error).toBeUndefined();
    });

    it('should sanitize HTML in message', () => {
        const result = sanitizeChatMessage('<b>Hello</b>');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('Hello');
    });

    it('should reject empty message', () => {
        const result = sanitizeChatMessage('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Message cannot be empty');
    });

    it('should reject whitespace-only message', () => {
        const result = sanitizeChatMessage('   ');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Message cannot be empty');
    });

    it('should reject message exceeding length', () => {
        const longMessage = 'A'.repeat(1001);
        const result = sanitizeChatMessage(longMessage);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Message too long (max 1000 characters)');
    });

    it('should accept message at max length', () => {
        const message = 'A'.repeat(1000);
        const result = sanitizeChatMessage(message);
        expect(result.valid).toBe(true);
    });
});
