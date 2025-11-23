/**
 * JustTheTip Bot Configuration
 */

import dotenv from 'dotenv';
import path from 'path';
import { dirname } from '@tiltcheck/esm-utils';

const __dirname = dirname(import.meta.url);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export interface JTTBotConfig {
  discordToken: string;
  clientId: string;
  guildId?: string;
  nodeEnv: 'development' | 'production' | 'test';
}

function getEnvVar(key: string, required = true): string {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export const config: JTTBotConfig = {
  discordToken: getEnvVar('JTT_DISCORD_TOKEN'),
  clientId: getEnvVar('JTT_DISCORD_CLIENT_ID'),
  guildId: getEnvVar('JTT_DISCORD_GUILD_ID', false) || getEnvVar('JTT_GUILD_ID', false),
  nodeEnv: (process.env.NODE_ENV || 'development') as JTTBotConfig['nodeEnv'],
};

export function validateConfig(): void {
  if (!config.discordToken) {
    throw new Error('JTT_DISCORD_TOKEN is required');
  }
  if (!config.clientId) {
    throw new Error('JTT_DISCORD_CLIENT_ID is required');
  }
  console.log('[JTT Bot] Configuration loaded');
  console.log(`[JTT Bot] Environment: ${config.nodeEnv}`);
}
