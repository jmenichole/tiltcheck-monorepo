/**
 * Balance Command
 * Check wallet balance
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { hasWallet, getWallet, getWalletBalance } from '@tiltcheck/justthetip';

export const balance: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your Solana wallet balance'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    if (!hasWallet(interaction.user.id)) {
      await interaction.editReply({
        content: '❌ No wallet registered. Use `/wallet action:register address:<your-address>`',
      });
      return;
    }

    try {
      const balance = await getWalletBalance(interaction.user.id);
      const wallet = getWallet(interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('💰 Wallet Balance')
        .addFields(
          { name: 'Balance', value: `${balance.toFixed(6)} SOL`, inline: true },
          { name: 'Address', value: `\`${wallet?.address}\``, inline: false },
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
};
