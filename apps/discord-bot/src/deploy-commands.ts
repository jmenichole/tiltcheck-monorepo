/**
 * Command Deployment Script
 * 
 * Registers slash commands with Discord API.
 */

import path from 'path';
import { config } from './config.js';
import { CommandHandler } from './handlers/commands.js';
import { deployCommands as sharedDeploy, diffCommands as sharedDiff, fetchExisting as sharedFetchExisting } from '@tiltcheck/discord-utils';
import { REST } from 'discord.js';

interface DiffResult {
  added: string[]; removed: string[]; unchanged: string[];
}

function diff(existing: any[], next: any[]): DiffResult {
  const existingNames = new Set(existing.map(c => c.name));
  const nextNames = new Set(next.map(c => c.name));
  const added = [...nextNames].filter(n => !existingNames.has(n));
  const removed = [...existingNames].filter(n => !nextNames.has(n));
  const unchanged = [...nextNames].filter(n => existingNames.has(n));
  return { added, removed, unchanged };
}

async function fetchExisting(rest: REST, clientId: string, guildId?: string) {
  try {
    if (guildId) {
      return await rest.get(Routes.applicationGuildCommands(clientId, guildId)) as any[];
    }
    return await rest.get(Routes.applicationCommands(clientId)) as any[];
  } catch (e) {
    console.warn('[Deploy] Could not fetch existing (continuing):', (e as Error).message);
    return [];
  }
}

async function deployCommands() {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const removeIdx = args.findIndex(a => a === '--remove');
    const removeName = removeIdx >= 0 ? args[removeIdx + 1] : undefined;
    console.log('[Deploy] Loading commands...');

    // Create CommandHandler to load commands
    const commandHandler = new CommandHandler();
    commandHandler.loadCommands();

    let commands = commandHandler.getCommandData();

    if (removeName) {
      commands = commands.filter((c: any) => c.name !== removeName);
      console.log(`[Deploy] Selective removal requested: ${removeName}`);
    }

    if (commands.length === 0) {
      console.error('[Deploy] Zero commands after processing. Aborting to prevent wipe.');
      process.exit(1);
    }

    console.log(`[Deploy] Deploying ${commands.length} commands...`);

    const rest = new REST({ version: '10' }).setToken(config.discordToken);
    const existing = await sharedFetchExisting(rest, config.clientId, config.guildId);
    const diffRes = sharedDiff(existing, commands);
    console.log('[Deploy] Diff:');
    console.log('  Added:', diffRes.added.length ? diffRes.added.join(', ') : '(none)');
    console.log('  Removed:', diffRes.removed.length ? diffRes.removed.join(', ') : '(none)');
    console.log('  Unchanged:', diffRes.unchanged.length ? diffRes.unchanged.join(', ') : '(none)');

    if (dryRun) {
      console.log('\n[Deploy] Dry-run: no changes applied.');
      process.exit(0);
    }

    const result = await sharedDeploy({
      token: config.discordToken,
      clientId: config.clientId,
      guildId: config.guildId,
      commandsDir: path.join(process.cwd(), 'src', 'commands'),
      removeName,
      dryRun: false,
      artifactDir: path.join(process.cwd(), 'data')
    });
    console.log('[Deploy] Successfully deployed commands. Artifact:', result.artifact);
    console.log('[Deploy] Commands deployed:');
    result.diff.added.concat(result.diff.unchanged).forEach(name => {
      const cmd = commands.find((c: any) => c.name === name);
      if (cmd) console.log(`  - /${cmd.name}: ${cmd.description}`);
    });
  } catch (error) {
    console.error('[Deploy] Error deploying commands:', error);
    process.exit(1);
  }
}

// Run deployment
deployCommands();
