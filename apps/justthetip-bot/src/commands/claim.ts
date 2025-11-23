/**
 * Claim Command
 * Claim pending tips
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { hasWallet } from '@tiltcheck/justthetip';

export const claim: Command = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim pending tips sent before you registered'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    if (!hasWallet(interaction.user.id)) {
      await interaction.editReply({
        content: '❌ You need to register a wallet first!\n' +
          'Use `/wallet action:register address:<your-address>` to connect your wallet.',
      });
      return;
    }

    await interaction.editReply({
      content: '💰 **Claim Pending Tips**\n\n' +
        'Coming soon! You\'ll be able to:\n' +
        '• View all tips sent to you before registration\n' +
        '• Claim them to your connected wallet\n' +
        '• See who sent each tip and when\n\n' +
        'For now, use `/pending` to view pending tips.',
    });
    
    // TODO: Implement pending tip claiming
    // Should fetch tips from pending-tips.json and create
    // Solana Pay requests for each one
  },
};
