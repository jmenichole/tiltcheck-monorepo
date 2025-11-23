/**
 * Event Handler
 * Manages Discord client events
 */

import { Client, Events, REST, Routes } from 'discord.js';
// import { isNewUser, sendWelcomeDM } from '@tiltcheck/discord-utils'; // TEMP: not exported yet
// import { parseSetupRequest } from '@tiltcheck/ai-service'; // TEMP: package doesn't exist
import { config } from '../config.js';
import type { CommandHandler } from './commands.js';

export class EventHandler {
  constructor(
    private client: Client,
    private commandHandler: CommandHandler
  ) {}

  registerDiscordEvents(): void {
    // Ready event
    this.client.once(Events.ClientReady, async (client) => {
      console.log(`[JTT Bot] Ready! Logged in as ${client.user.tag}`);
      console.log(`[JTT Bot] Serving ${client.guilds.cache.size} guilds`);
      
      // Auto-register slash commands
      console.log('[JTT Bot] 🔄 Auto-registering slash commands...');
      try {
        const rest = new REST({ version: '10' }).setToken(config.discordToken);
        const commands = this.commandHandler.getAllCommands();
        const commandData = commands.map(cmd => cmd.data.toJSON());
        
        // Try guild-specific first, fallback to global
        try {
          if (config.guildId) {
            await rest.put(
              Routes.applicationGuildCommands(config.clientId, config.guildId),
              { body: commandData }
            );
            console.log(`[JTT Bot] ✅ Registered ${commandData.length} guild commands`);
          } else {
            throw new Error('No guild ID configured');
          }
        } catch (guildError: any) {
          console.log('[JTT Bot] ⚠️  Guild registration failed, trying global...');
          await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commandData }
          );
          console.log(`[JTT Bot] ✅ Registered ${commandData.length} global commands (may take ~1hr)`);
        }
      } catch (error) {
        console.error('[JTT Bot] ❌ Failed to register commands:', error);
      }
    });

    // Interaction create (slash commands)
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      // Check if this is a new user - send welcome DM on first command
      // TEMP: disabled until isNewUser/sendWelcomeDM are exported
      // if (isNewUser(interaction.user.id)) {
      //   await sendWelcomeDM(interaction.user, 'JustTheTip');
      // }

      const command = this.commandHandler.getCommand(interaction.commandName);

      if (!command) {
        console.warn(`[JTT Bot] Unknown command: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
        console.log(`[JTT Bot] ${interaction.user.tag} used /${interaction.commandName}`);
      } catch (error) {
        console.error(`[JTT Bot] Error executing ${interaction.commandName}:`, error);

        const errorMessage = {
          content: 'There was an error executing this command!',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    });

    // Message create (handle DM conversations with AI setup wizard)
    this.client.on(Events.MessageCreate, async (message) => {
      // Ignore bot messages
      if (message.author.bot) return;

      // Handle DM conversations with AI setup wizard
      // TEMP: disabled until @tiltcheck/ai-service exists
      /*
      if (message.channel.isDMBased()) {
        try {
          const setupAction = await parseSetupRequest(message.content, message.author.id);
          
          // Send AI-generated response
          await message.reply(setupAction.suggestedResponse.replace(/\\n/g, '\n'));
          
          // Log AI-detected intent for debugging
          console.log(
            `[JTT Bot] AI Setup: ${message.author.tag} - Intent: ${setupAction.intent} (confidence: ${setupAction.confidence})`
          );
        } catch (error) {
          console.error('[JTT Bot] Error in AI setup wizard:', error);
          await message.reply(
            '🤔 Sorry, I had trouble understanding that. Try using slash commands like `/help` or `/email-preferences`!'
          );
        }
      }
      */
    });
  }
}
