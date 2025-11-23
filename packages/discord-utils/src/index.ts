/**
 * @tiltcheck/discord-utils
 * 
 * Shared Discord utilities for TiltCheck ecosystem.
 * 
 * Provides:
 * - Embed builders with consistent branding
 * - Text formatters for Discord markdown
 * - Input validators for commands
 * - Onboarding helpers (welcome DM, state tracking)
 */

export * from './embeds.js';
export * from './formatters.js';
export * from './validators.js';
export * from './command-deploy.js';
export * from './onboarding.js';
// Async discovery helper (TypeScript source compatible)
export { discoverCommandsAsync } from './command-deploy.js';
