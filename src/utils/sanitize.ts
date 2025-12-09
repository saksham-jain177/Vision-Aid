/**
 * Input sanitization and validation utilities
 */

/**
 * Remove HTML tags and scripts from user input
 */
export function sanitizeInput(input: string): string {
    // Remove script tags and their content FIRST
    let clean = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Then remove all remaining HTML tags
    clean = clean.replace(/<[^>]*>/g, '');

    // Trim whitespace
    return clean.trim();
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate message length
 */
export function validateMessageLength(message: string, maxLength: number = 1000): boolean {
    return message.length > 0 && message.length <= maxLength;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Sanitize and validate user input for chat messages
 */
export function sanitizeChatMessage(message: string): { valid: boolean; sanitized: string; error?: string } {
    if (!message || message.trim().length === 0) {
        return { valid: false, sanitized: '', error: 'Message cannot be empty' };
    }

    const sanitized = sanitizeInput(message);

    if (!validateMessageLength(sanitized, 1000)) {
        return { valid: false, sanitized, error: 'Message too long (max 1000 characters)' };
    }

    return { valid: true, sanitized };
}
