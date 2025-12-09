// Test setup file
import { expect } from 'vitest';

// Mock localStorage for testing
class LocalStorageMock {
    private store: { [key: string]: string } = {};

    getItem(key: string): string | null {
        return this.store[key] || null;
    }

    setItem(key: string, value: string): void {
        this.store[key] = value;
    }

    removeItem(key: string): void {
        delete this.store[key];
    }

    clear(): void {
        this.store = {};
    }

    get length(): number {
        return Object.keys(this.store).length;
    }

    key(index: number): string | null {
        const keys = Object.keys(this.store);
        return keys[index] || null;
    }
}

// @ts-ignore
global.localStorage = new LocalStorageMock();
