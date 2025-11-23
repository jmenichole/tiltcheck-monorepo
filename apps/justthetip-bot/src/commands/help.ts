/**
 * Help Command
 * JustTheTip bot commands and features
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
// import { getProfile } from '@tiltcheck/identity-core'; // TODO: Re-enable when identity-core package exists
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show JustTheTip commands and features'),

  async execute(interaction: ChatInputCommandInteraction) {
    // const profile = getProfile(interaction.user.id); // TODO: Re-enable
    const embed = new EmbedBuilder()
      .setColor(0x14F195)
      .setTitle('💸 JustTheTip - Non-Custodial Solana Tipping')
      .setDescription('Send and receive SOL tips with zero custody risk!')
      .addFields(
        {
          name: '💳 Wallet Management',
          value:
            '`/wallet action:view` - View your connected wallet\n' +
            '`/wallet action:register address:<addr>` - Connect your Phantom/Solflare wallet\n' +
            '`/balance` - Check your SOL balance',
          inline: false,
        },
        {
          name: '💸 Tipping & Airdrops',
          value:
            '`/tip user:@user amount:10` - Send $10 USD tip to another user\n' +
            '`/tip user:@user amount:0.5 sol` - Send 0.5 SOL tip\n' +
            '`/airdrop recipients:@user1 @user2 amount:5` - Tip multiple users $5 each\n' +
            '`/pending` - View your unclaimed tips\n' +
            '`/claim` - Claim pending tips (auto-claims on wallet registration)\n' +
            '`/history limit:10` - View transaction history (coming soon)\n' +
            '`/leaderboard type:sent` - Top tippers & receivers (coming soon)',
          inline: false,
        },
        {
          name: '🎯 Trivia Games',
          value:
            '`/triviadrop start category:<topic> difficulty:<level>` - Start trivia\n' +
            '`/triviadrop answer response:<answer>` - Submit your answer\n' +
            '`/triviadrop leaderboard limit:10` - Top trivia players\n' +
            '`/triviadrop stats` - Your trivia statistics',
          inline: false,
        },
        {
          name: '🛠️ Support & Utility',
          value:
            '`/help` - Show this help message\n' +
            '`/support` - Contact support team',
          inline: false,
        },
        {
          name: '✨ Key Features',
          value:
            '✅ **Non-custodial** - You control your funds\n' +
            '✅ **USD amounts** - Tip in dollars, auto-converted to SOL\n' +
            '✅ **Low fees** - Only $0.07 USD (0.0007 SOL) per tip\n' +
            '✅ **Email receipts** - Transaction confirmations via email\n' +
            '✅ **Solana Pay** - Opens in Phantom, Solflare, Backpack, etc.\n' +
            '✅ **No KYC** - Just connect your wallet address\n' +
            '✅ **Instant** - Tips arrive in seconds on-chain\n' +
            '✅ **Pending tips** - Auto-claimed when recipient registers',
          inline: false,
        }
      )
      .setFooter({ text: 'Powered by Solana Pay • Non-custodial tipping' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
