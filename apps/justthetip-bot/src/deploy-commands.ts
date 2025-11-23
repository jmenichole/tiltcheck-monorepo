/**
 * Deploy (register) slash commands for JustTheTip bot.
 * Global registration replaces all existing commands (upsert),
 * so omission of a command effectively deletes it.
 *
 * Features:
 *  - Discovers command definitions in src/commands
 *  - Dry-run mode (--dry-run) prints diff without modifying Discord
 *  - Safety: aborts if zero commands discovered (prevents accidental wipe)
 *  - Optional guild-only registration via --guild <id> for faster iteration
 *  - Writes artifact of deployed command names to data/last-command-sync.json
 */
import path from 'path';
import { deployCommands, diffCommands, fetchExisting, discoverCommandsAsync, writeArtifact } from '@tiltcheck/discord-utils';
import dotenv from 'dotenv';

// Load local .env without exposing values
dotenv.config({ path: path.join(process.cwd(), '.env') });
import { REST, Routes } from 'discord.js';

interface EnvConfig {
  token: string;
  clientId: string;
}

function loadEnv(): EnvConfig {
  const token = process.env.JUSTTHETIP_DISCORD_TOKEN || process.env.DISCORD_TOKEN || '';
  const clientId = process.env.JUSTTHETIP_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '';
  if (!token) throw new Error('Missing JUSTTHETIP_DISCORD_TOKEN (or DISCORD_TOKEN)');
  if (!clientId) throw new Error('Missing JUSTTHETIP_DISCORD_CLIENT_ID (or DISCORD_CLIENT_ID)');
  return { token, clientId };
}

const commandsDir = path.join(process.cwd(), 'src', 'commands');

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const removeFlag = args.findIndex(a => a === '--remove');
    const removeName = removeFlag >= 0 ? args[removeFlag + 1] : undefined;  
  const guildFlagIndex = args.findIndex(a => a === '--guild');
  const guildId = guildFlagIndex >= 0 ? args[guildFlagIndex + 1] : undefined;
  // Load env only if we need to perform a live mutation
  let token = '';
  let clientId = '';
  if (!dryRun) {
    ({ token, clientId } = loadEnv());
  } else {
    clientId = process.env.JUSTTHETIP_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || 'DUMMY_CLIENT_ID';
  }

  // Filesystem discovery using ESM-safe createRequire wrapper (see discord-utils)
  const discovered = await discoverCommandsAsync(commandsDir);
  console.log(`Discovered ${discovered.length} commands via async scan.`);
  if (discovered.length === 0) {
    console.error('❌ No commands discovered; aborting to prevent wipe.');
    process.exit(1);
  }

  let existing: any[] = [];
  if (!dryRun && token) {
    const rest = new REST({ version: '10' }).setToken(token);
    existing = await fetchExisting(rest, clientId, guildId);
  }
  const diff = diffCommands(existing, discovered);
  console.log('Diff:');
  console.log('  Added:', diff.added.length ? diff.added.join(', ') : '(none)');
  console.log('  Removed:', diff.removed.length ? diff.removed.join(', ') : '(none)');
  console.log('  Unchanged:', diff.unchanged.length ? diff.unchanged.join(', ') : '(none)');

  if (dryRun) {
    console.log('\nDry-run mode: no changes applied.');
    process.exit(0);
  }

  try {
    const result = await deployCommands({
      token,
      clientId,
      guildId,
      commandsDir,
      removeName,
      dryRun: false,
      artifactDir: path.join(process.cwd(), 'data')
    });
    console.log('✅ Registration successful. Artifact:', result.artifact);
  } catch (e) {
    console.error('❌ Registration failed:', (e as Error).message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error during deployment:', err);
  process.exit(1);
});
