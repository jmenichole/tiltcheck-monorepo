import { expect } from 'vitest';
import { getEvents } from './events.js';

export function expectEvent(type: string, predicate?: (e: any) => boolean) {
  const events = getEvents(type);
  expect(events.length).toBeGreaterThan(0);
  if (predicate) {
    expect(events.some(predicate)).toBe(true);
  }
}

export function expectNoEvent(type: string) {
  const events = getEvents(type);
  expect(events.length).toBe(0);
}
