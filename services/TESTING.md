# Services Testing Guide

- Services should emit events; assert them with `@tiltcheck/test-utils` helpers.
- External calls (HTTP, RPC) should be wrapped for easy mocking.
- Use contract tests to guarantee event payload stability.

```ts
import { expectEvent } from '@tiltcheck/test-utils';
// trigger service logic
expectEvent('price.updated', e => e.data.token === 'SOL');
```
