/**
 * Pending Command
 * View pending tips
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

export const pending: Command = {
  data: new SlashCommandBuilder()
    .setName('pending')
    .setDescription('View pending tips sent to you'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: '📋 **Pending Tips**\n\n' +
        'Feature coming soon!\n' +
        'You\'ll be able to see tips sent to you before you registered a wallet.',
      ephemeral: true,
    });
    
    // TODO: Integrate with getPendingTips from justthetip module
  },
};
