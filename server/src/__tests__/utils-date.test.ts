import { describe, it, expect } from 'vitest';
import { getUtcDay } from '../utils/date.js';

describe('utils/date.ts - getUtcDay', () => {
  it('returns a string in YYYY-MM-DD format for a given date', () => {
    const date = new Date('2024-06-15T10:30:00Z');
    const result = getUtcDay(date);
    expect(result).toBe('2024-06-15');
  });

  it('returns the UTC date even for a late-night local time', () => {
    // UTC midnight on Jan 1 2024
    const date = new Date('2024-01-01T00:00:00Z');
    expect(getUtcDay(date)).toBe('2024-01-01');
  });

  it('format is exactly 10 characters (YYYY-MM-DD)', () => {
    const result = getUtcDay(new Date('2023-12-31T23:59:59Z'));
    expect(result).toHaveLength(10);
  });

  it('contains exactly two hyphens', () => {
    const result = getUtcDay(new Date('2023-07-04T12:00:00Z'));
    const hyphens = (result.match(/-/g) || []).length;
    expect(hyphens).toBe(2);
  });

  it('returns a parseable date string', () => {
    const date = new Date('2025-03-11T08:00:00Z');
    const result = getUtcDay(date);
    const parsed = new Date(result);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it('uses today when called with no argument', () => {
    const result = getUtcDay();
    // Should match format YYYY-MM-DD
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // And should be approximately today
    const today = new Date().toISOString().slice(0, 10);
    expect(result).toBe(today);
  });

  it('handles end of month correctly', () => {
    const date = new Date('2024-02-29T12:00:00Z'); // leap year
    expect(getUtcDay(date)).toBe('2024-02-29');
  });

  it('handles different months', () => {
    const dates = [
      { input: '2024-01-15T00:00:00Z', expected: '2024-01-15' },
      { input: '2024-06-30T23:59:59Z', expected: '2024-06-30' },
      { input: '2024-12-01T00:00:01Z', expected: '2024-12-01' },
    ];
    for (const { input, expected } of dates) {
      expect(getUtcDay(new Date(input))).toBe(expected);
    }
  });
});
