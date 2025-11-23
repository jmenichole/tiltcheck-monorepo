/**
 * Tip Event Handlers
 * Listens for tip confirmations and sends email receipts
 */

import { eventRouter, type EventHandler } from '@tiltcheck/event-router';
import type { TiltCheckEvent } from '@tiltcheck/types';
// import { sendTipReceipt, isEmailEnabled } from '@tiltcheck/email-service'; // TODO: Re-enable when package exists
import { Client } from 'discord.js';

/**
 * Register tip event listeners
 */
export function registerTipEventHandlers(client: Client): void {
  console.log('[TipEvents] Registering tip event handlers...');

  // Listen for confirmed tips
  const tipConfirmedHandler: EventHandler = async (event: TiltCheckEvent) => {
    console.log('[TipEvents] Tip confirmed:', event.data);

    const { signature, userId, recipientId, amount } = event.data;

    try {
      // Get user and recipient from Discord
      const sender = await client.users.fetch(userId);
      const recipient = recipientId ? await client.users.fetch(recipientId) : null;

      // Send confirmation DM to sender
      try {
        await sender.send({
          content: 
            `✅ **Tip Confirmed!**\n\n` +
            `**Recipient:** ${recipient?.username || 'Unknown'}\n` +
            `**Amount:** $${(amount * 100).toFixed(2)} USD (${amount.toFixed(4)} SOL)\n` +
            `**Transaction:** \`${signature}\`\n` +
            `**Explorer:** https://solscan.io/tx/${signature}\n\n` +
            `Your tip has been delivered! 🎉`,
        });
      } catch (e) {
        console.warn('[TipEvents] Failed to send confirmation DM:', (e as Error).message);
      }

      // Send email receipt if enabled and user has email
      // TODO: Re-enable when email-service package exists
      /*
      if (isEmailEnabled()) {
        const userEmails = loadUserEmails();
        const senderEmail = userEmails[userId];

        if (senderEmail) {
          await sendTipReceipt({
            userEmail: senderEmail,
            recipientName: recipient?.username || 'Unknown User',
            amount: `$${(amount * 100).toFixed(2)} USD (${amount.toFixed(4)} SOL)`,
            recipient: recipient?.tag || 'Unknown#0000',
            txSignature: signature,
            fee: '$0.07 USD (0.0007 SOL)',
          });
          console.log('[TipEvents] Email receipt sent to', senderEmail);
        }
      }
      */

      // Notify recipient
      if (recipient) {
        try {
          await recipient.send({
            content:
              `💰 **You Received a Tip!**\n\n` +
              `**From:** ${sender.username}\n` +
              `**Amount:** $${(amount * 100).toFixed(2)} USD (${amount.toFixed(4)} SOL)\n` +
              `**Transaction:** \`${signature}\`\n` +
              `**Explorer:** https://solscan.io/tx/${signature}\n\n` +
              `Check your wallet! 🎊`,
          });
        } catch (e) {
          console.warn('[TipEvents] Failed to notify recipient:', (e as Error).message);
        }
      }
    } catch (error) {
      console.error('[TipEvents] Error handling tip confirmation:', error);
    }
  };

  eventRouter.subscribe('tip.confirmed', tipConfirmedHandler, 'justthetip');

  // Listen for failed tips
  const tipFailedHandler: EventHandler = async (event: TiltCheckEvent) => {
    console.log('[TipEvents] Tip failed:', event.data);

    const { signature, userId, error } = event.data;

    try {
      const user = await client.users.fetch(userId);
      await user.send({
        content:
          `❌ **Tip Failed**\n\n` +
          `**Transaction:** \`${signature}\`\n` +
          `**Error:** ${error || 'Unknown error'}\n\n` +
          `Please try again or contact support if the issue persists.`,
      });
    } catch (e) {
      console.warn('[TipEvents] Failed to send failure notification:', (e as Error).message);
    }
  };

  eventRouter.subscribe('tip.failed', tipFailedHandler, 'justthetip');

  console.log('[TipEvents] ✅ Tip event handlers registered');
}
