import { describe, it, expect } from 'vitest';
import {
  formatUrl, formatPercentage, createProgressBar, bulletList, numberedList
} from '../src/formatters.js';
import {
  isValidAmount, sanitizeInput, isKnownCasino, extractUrls, containsMentions,
  validateArgs, isValidUrl, isValidUserId, isValidChannelId, isValidRoleId
} from '../src/validators.js';

describe('discord-utils edge & branch coverage', () => {
  it('formatUrl truncates long URLs', () => {
    const long = 'https://example.com/' + 'a'.repeat(80);
    const truncated = formatUrl(long, 30);
    expect(truncated.endsWith('...')).toBe(true);
    expect(truncated.length).toBeLessThanOrEqual(30);
  });

  it('formatPercentage respects decimal places', () => {
    expect(formatPercentage(12.345, 2)).toBe('12.35%');
  });

  it('createProgressBar clamps values and builds proportional bar', () => {
    const bar = createProgressBar(150, 100, 10); // >100% clamps
    expect(bar.length).toBe(10);
    const zeroBar = createProgressBar(-5, 100, 8); // <0 clamps
    expect(zeroBar.length).toBe(8);
  });

  it('bulletList returns empty string for empty array', () => {
    expect(bulletList([])).toBe('');
  });

  it('numberedList enumerates items', () => {
    expect(numberedList(['a','b']).split('\n')[1].startsWith('2.')).toBe(true);
  });

  it('isValidAmount handles NaN, min, max', () => {
    expect(isValidAmount('abc').valid).toBe(false);
    expect(isValidAmount('5', 10).valid).toBe(false);
    expect(isValidAmount('500', 0, 100).valid).toBe(false);
    const ok = isValidAmount('25', 10, 100);
    expect(ok.valid).toBe(true);
    expect(ok.value).toBe(25);
  });

  it('sanitizeInput strips markdown & dangerous mentions', () => {
    const raw = '**Hello** @everyone _world_ ~strike~ `code` |pipe|';
    const clean = sanitizeInput(raw);
    expect(clean).not.toMatch(/\*|_|~|`|\|/);
    expect(clean).toMatch(/@ everyone/);
  });

  it('isKnownCasino recognizes known domains and rejects others', () => {
    expect(isKnownCasino('https://stake.com/promo')).toBe(true);
    expect(isKnownCasino('https://unknown-site.xyz')).toBe(false);
  });

  it('extractUrls pulls multiple URLs from text', () => {
    const text = 'Check https://stake.com and https://example.org/test now';
    const urls = extractUrls(text);
    expect(urls.length).toBe(2);
  });

  it('containsMentions detects user & everyone mentions', () => {
    expect(containsMentions('<@123456789012345678>')).toBe(true);
    expect(containsMentions('@everyone')).toBe(true);
    expect(containsMentions('no mentions here')).toBe(false);
  });

  it('validateArgs enforces required and max lengths', () => {
    expect(validateArgs(['a'], 2).valid).toBe(false);
    expect(validateArgs(['a','b','c'], 1, 2).valid).toBe(false);
    expect(validateArgs(['a','b'], 1, 3).valid).toBe(true);
  });

  it('basic ID validators accept proper length and reject malformed', () => {
    const good = '123456789012345678';
    expect(isValidUserId(good)).toBe(true);
    expect(isValidChannelId(good)).toBe(true);
    expect(isValidRoleId(good)).toBe(true);
    expect(isValidUserId('short')).toBe(false);
  });

  it('isValidUrl validates proper URL and rejects invalid', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('notaurl')).toBe(false);
  });
});
