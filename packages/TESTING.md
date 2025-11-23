# Packages Testing Guide

- Utility packages: focus on pure function coverage.
- Use `@tiltcheck/test-utils` for event-driven utilities only.
- Keep mock builders in `@tiltcheck/test-utils` rather than duplicating per package.

```ts
import { resetEvents } from '@tiltcheck/test-utils';
resetEvents();
```
