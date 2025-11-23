/**
 * Leaderboard Command
 * Show top tippers and receivers
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const leaderboard: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View tipping leaderboard')
    .addStringOption(opt =>
      opt
        .setName('type')
        .setDescription('Leaderboard type')
        .addChoices(
          { name: 'Top Tippers', value: 'sent' },
          { name: 'Top Receivers', value: 'received' },
          { name: 'Most Active', value: 'activity' }
        )
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt
        .setName('limit')
        .setDescription('Number of users to show (default: 10)')
        .setMinValue(5)
        .setMaxValue(25)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString('type') || 'sent';
    const limit = interaction.options.getInteger('limit') || 10;

    const embed = new EmbedBuilder()
      .setColor(0x14F195)
      .setTitle('🏆 Tipping Leaderboard')
      .setDescription(
        type === 'sent' ? 'Most generous tippers' :
        type === 'received' ? 'Top tip receivers' :
        'Most active users'
      )
      .addFields({
        name: 'Coming Soon!',
        value: 'Track top performers:\n' +
          '• Total SOL sent/received\n' +
          '• Number of transactions\n' +
          '• Average tip amounts\n' +
          '• Streaks and achievements',
      })
      .setFooter({ text: `Showing top ${limit} users` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    
    // TODO: Implement leaderboard from transaction history
    // Query all tips and aggregate by user
  },
};
