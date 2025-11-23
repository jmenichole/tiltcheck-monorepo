# Modules Testing Guide

Shared patterns for module tests:

- Import `@tiltcheck/test-utils` for event assertions (`expectEvent`, `resetEvents`).
- Use isolated instances of stateful modules; avoid cross-test leakage.
- Prefer contract tests in `tests/contracts` for stable surfaces.

Example:
```ts
import { expectEvent } from '@tiltcheck/test-utils';
import { eventRouter } from '@tiltcheck/event-router';

expectEvent('tip.initiated');
```
