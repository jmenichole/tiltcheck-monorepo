/**
 * History Command
 * View tip transaction history
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

export const history: Command = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View your tip transaction history')
    .addIntegerOption(opt =>
      opt
        .setName('limit')
        .setDescription('Number of recent transactions to show (default: 10)')
        .setMinValue(5)
        .setMaxValue(50)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: '📜 **Transaction History**\n\n' +
        'Coming soon! You\'ll be able to view:\n' +
        '• Tips you\'ve sent\n' +
        '• Tips you\'ve received\n' +
        '• Transaction amounts and timestamps\n' +
        '• Solana explorer links',
      ephemeral: true,
    });
    
    // TODO: Implement transaction history from JustTheTip module
    // This should query Solana blockchain for transactions
    // involving the user's registered wallet
  },
};
