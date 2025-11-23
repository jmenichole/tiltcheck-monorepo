/**
 * Tip Command
 * Send SOL tips to other users
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { hasWallet, getWallet, createTipWithFeeRequest } from '@tiltcheck/justthetip';
import { parseAmount } from '@tiltcheck/natural-language-parser';
import { isOnCooldown } from '@tiltcheck/tiltcheck-core';
import { Connection } from '@solana/web3.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export const tip: Command = {
  data: new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Send a SOL tip to another user')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('User to tip')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('amount')
        .setDescription('Amount in USD (e.g., "$10", "5", "20 dollars") or SOL ("0.5 sol")')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    // Check if sender is on cooldown
    if (isOnCooldown(interaction.user.id)) {
      await interaction.editReply({
        content: '🚫 You\'re on cooldown and cannot send tips right now. Take a break.',
      });
      return;
    }

    // Check sender has wallet
    if (!hasWallet(interaction.user.id)) {
      await interaction.editReply({
        content: '❌ You need to register a wallet first!\n' +
          'Use `/wallet action:register address:<your-address>` to connect your Solana wallet.',
      });
      return;
    }

    const recipient = interaction.options.getUser('user', true);
    const amountInput = interaction.options.getString('amount', true);

    // Don't allow self-tipping
    if (recipient.id === interaction.user.id) {
      await interaction.editReply({
        content: '❌ You cannot tip yourself!',
      });
      return;
    }

    // Parse amount with NLP
    const parseResult = parseAmount(amountInput);
    
    if (!parseResult.success || !parseResult.data) {
      await interaction.editReply({
        content: `❌ ${parseResult.error}\n\n` +
          `${parseResult.suggestions?.join('\n') || ''}`,
      });
      return;
    }

    const parsedAmount = parseResult.data;

    // Handle confirmation if needed
    if (parseResult.needsConfirmation && parseResult.confirmationPrompt) {
      const confirmButton = new ButtonBuilder()
        .setCustomId(`tip_confirm_sol_${recipient.id}_${parsedAmount.value}`)
        .setLabel(`Yes, ${parsedAmount.value} SOL`)
        .setStyle(ButtonStyle.Success);

      const cancelButton = new ButtonBuilder()
        .setCustomId('tip_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

      await interaction.editReply({
        content: `⚠️ **Confirmation Needed**\n\n${parseResult.confirmationPrompt}`,
        components: [row],
      });
      return;
    }

    // Check if recipient has wallet
    const recipientWallet = getWallet(recipient.id);
    
    if (!recipientWallet) {
      await interaction.editReply({
        content: `⚠️ ${recipient} doesn't have a wallet registered yet.\n` +
          'Your tip will be held for 24 hours. They can claim it by registering a wallet.',
      });
      // TODO: Create pending tip
      return;
    }

    // Generate Solana Pay deep link
    try {
      const senderWallet = getWallet(interaction.user.id);
      if (!senderWallet) {
        throw new Error('Sender wallet not found');
      }

      const { url } = await createTipWithFeeRequest(
        connection,
        senderWallet.address,
        recipientWallet.address,
        parsedAmount.value,
        `TiltCheck Tip to ${recipient.username}`
      );

      // Create button with Solana Pay deep link
      const payButton = new ButtonBuilder()
        .setLabel('💸 Open in Wallet')
        .setStyle(ButtonStyle.Link)
        .setURL(url);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(payButton);

      // Calculate USD equivalent if amount is in SOL
      const usdAmount = parsedAmount.currency === 'USD' 
        ? parsedAmount.value 
        : parsedAmount.value * 100; // Rough conversion, should use pricing oracle
      const solAmount = parsedAmount.currency === 'SOL'
        ? parsedAmount.value
        : parsedAmount.value / 100; // Rough conversion, should use pricing oracle

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('💸 Tip Ready to Send')
        .setDescription(
          `**Recipient:** ${recipient}\n` +
          `**Amount:** $${usdAmount.toFixed(2)} USD (${solAmount.toFixed(4)} SOL)\n` +
          `**Fee:** $0.07 USD (0.0007 SOL)\n` +
          `**Total:** $${(usdAmount + 0.07).toFixed(2)} USD\n\n` +
          '**Tap the button below** to open in your wallet:\n' +
          '• Phantom\n' +
          '• Solflare\n' +
          '• Backpack\n' +
          '• Any Solana wallet\n\n' +
          'Your device will ask which wallet to use! 📱'
        )
        .setFooter({ text: 'Powered by Solana Pay • Non-custodial' });

      await interaction.editReply({ 
        embeds: [embed],
        components: [row],
      });

      // Track transaction for monitoring (user will sign in their wallet)
      // Note: We don't have the signature yet - this would be added when we detect the transaction
      console.log(`[Tip] Created payment request: ${url.substring(0, 50)}... for ${interaction.user.tag} → ${recipient.tag}`);

    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to create payment request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
};
