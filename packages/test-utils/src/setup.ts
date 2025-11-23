import { beforeEach, afterEach } from 'vitest';
import { resetEvents } from './events.js';

// Shared test lifecycle helpers
beforeEach(() => {
  resetEvents();
});

afterEach(() => {
  // Future: cleanup temp dirs, mocks, timers
});
