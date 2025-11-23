/**
 * JustTheTipModule - Class wrapper for testing
 * Provides a stateful interface to the functional tip engine
 */

import { v4 as uuidv4 } from 'uuid';
import { eventRouter } from '@tiltcheck/event-router';
import { registerExternalWallet, getWallet, hasWallet, removeWallet, clearWallets } from './wallet-manager.js';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { swapDefaults } from './config.js';

export interface TipInitiated {
  id: string;
  senderId: string;
  recipientId: string;
  usdAmount: number;
  solAmount?: number;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  senderWallet?: string;
  recipientWallet?: string;
  createdAt: number;
}

export interface WalletRegistration {
  userId: string;
  address: string;
  type: 'x402' | 'magic' | 'phantom';
  registeredAt: number;
}

export interface DisconnectResult {
  success: boolean;
  message?: string;
  pendingTipsCount: number;
  wallet?: WalletRegistration;
}

export class JustTheTipModule {
  constructor() {
    // Ensure isolated wallet state per test instance
    clearWallets();
  }
  private pendingTips: Map<string, TipInitiated[]> = new Map();
  private allTips: Map<string, TipInitiated> = new Map();
  private minUsd = 0.10;
  private maxUsd = 100.00;

  async registerWallet(
    userId: string,
    address: string,
    type: 'x402' | 'magic' | 'phantom'
  ): Promise<WalletRegistration> {
    // Check if wallet already registered
    if (hasWallet(userId)) {
      throw new Error('❌ You already have a wallet registered');
    }

    await registerExternalWallet(userId, address);
    
    const registration: WalletRegistration = {
      userId,
      address,
      type,
      registeredAt: Date.now(),
    };

    void eventRouter.publish('wallet.registered', 'justthetip', registration);

    // Process pending tips for this user
    const pending = this.pendingTips.get(userId) || [];
    for (const tip of pending) {
      tip.recipientWallet = address;
      tip.status = 'completed';
    }
    if (pending.length > 0) {
      this.pendingTips.delete(userId);
      void eventRouter.publish('tip.pending.resolved', 'justthetip', { userId, count: pending.length });
    }

    return registration;
  }

  async disconnectWallet(userId: string): Promise<DisconnectResult> {
    const wallet = getWallet(userId);
    
    if (!wallet) {
      return {
        success: false,
        message: "❌ You don't have a wallet registered",
        pendingTipsCount: 0,
      };
    }

    // Count all pending tips involving this user (sent or received)
    const pendingCount = Array.from(this.allTips.values()).filter(
      tip => (tip.senderId === userId || tip.recipientId === userId) && tip.status === 'pending'
    ).length;
    
    const walletInfo: WalletRegistration = {
      userId: wallet.userId,
      address: wallet.address,
      type: 'phantom',
      registeredAt: wallet.registeredAt,
    };

    // Actually remove the wallet
    removeWallet(userId);
    
    let message = '✅ Wallet disconnected successfully';
    if (pendingCount > 0) {
      message = `⚠️ Wallet disconnected. You have ${pendingCount} pending tip${pendingCount > 1 ? 's' : ''} that may be affected.`;
    }

    return {
      success: true,
      message,
      pendingTipsCount: pendingCount,
      wallet: walletInfo,
    };
  }

  hasWallet(userId: string): boolean {
    return hasWallet(userId);
  }

  getWallet(userId: string): WalletRegistration | undefined {
    const wallet = getWallet(userId);
    if (!wallet) return undefined;
    
    return {
      userId: wallet.userId,
      address: wallet.address,
      type: 'phantom',
      registeredAt: wallet.registeredAt,
    };
  }

  async initiateTip(
    senderId: string,
    recipientId: string,
    amount: number,
    currency: 'USD' | 'SOL' = 'USD'
  ): Promise<TipInitiated> {
    // Validate amount
    if (currency === 'USD') {
      if (amount < this.minUsd || amount > this.maxUsd) {
        throw new Error(`❌ Amount must be between $${this.minUsd.toFixed(2)} and $${this.maxUsd.toFixed(2)} USD`);
      }
    }

    // Check sender has wallet
    if (!hasWallet(senderId)) {
      throw new Error('❌ Please register your wallet first using `/register-magic`');
    }

    const senderWallet = getWallet(senderId);
    const recipientWallet = hasWallet(recipientId) ? getWallet(recipientId) : undefined;

    const solConversion = currency === 'USD' ? (pricingOracle.getUsdPrice('SOL') ? amount / pricingOracle.getUsdPrice('SOL') : undefined) : amount;
    const tip: TipInitiated = {
      id: uuidv4(),
      senderId,
      recipientId,
      usdAmount: currency === 'USD' ? amount : 0,
      solAmount: solConversion,
      status: 'pending',
      reference: uuidv4(),
      senderWallet: senderWallet?.address,
      recipientWallet: recipientWallet?.address,
      createdAt: Date.now(),
    };

    // If recipient has no wallet, store as pending
    if (!recipientWallet) {
      const existing = this.pendingTips.get(recipientId) || [];
      existing.push(tip);
      this.pendingTips.set(recipientId, existing);
    }

    void eventRouter.publish('tip.initiated', 'justthetip', tip);

    // Store tip
    this.allTips.set(tip.id, tip);

    return tip;
  }

  async completeTip(tipId: string, signature: string): Promise<TipInitiated & { completedAt: number }> {
    const tip = this.allTips.get(tipId);
    if (!tip) {
      throw new Error('Tip not found');
    }

    const completedTip = {
      ...tip,
      status: 'completed' as const,
      signature,
      completedAt: Date.now(),
    };

    this.allTips.set(tipId, completedTip);
    void eventRouter.publish('tip.completed', 'justthetip', completedTip);

    return completedTip;
  }

  getTipsForUser(userId: string): TipInitiated[] {
    return Array.from(this.allTips.values()).filter(
      tip => tip.senderId === userId || tip.recipientId === userId
    );
  }

  generateSolanaPayURL(
    recipientAddress: string,
    amount: number,
    reference: string,
    label?: string
  ): string {
    const params = new URLSearchParams({
      amount: amount.toString(),
      reference,
    });
    
    if (label) {
      params.set('label', label);
    }

    return `solana:${recipientAddress}?${params.toString()}`;
  }

  getPendingTipsForUser(userId: string): TipInitiated[] {
    return this.pendingTips.get(userId) || [];
  }

  async processPendingTips(userId: string): Promise<void> {
    const pending = this.pendingTips.get(userId) || [];
    for (const tip of pending) {
      tip.status = 'completed';
    }
    this.pendingTips.delete(userId);
  }

  clearState(): void {
    this.pendingTips.clear();
    this.allTips.clear();
    clearWallets();
  }

  // --- Token tipping (USD-stable token -> SOL simulated swap) ---
  private quotes: Map<string, any> = new Map();

  async initiateTokenTip(
    senderId: string,
    recipientId: string,
    amountUsd: number,
    inputMint: string,
    opts?: Partial<{ slippageBps: number; platformFeeBps: number; networkFeeLamports: number }>
  ): Promise<{ tip: TipInitiated; quote: any }> {
    if (!hasWallet(senderId)) throw new Error('❌ Sender wallet not registered');
    if (!hasWallet(recipientId)) throw new Error('❌ Recipient wallet not registered');

    const solPrice = pricingOracle.getUsdPrice('SOL') || 0;
    const estimatedOutputAmount = solPrice ? amountUsd / solPrice : 0;
    const slippageBps = opts?.slippageBps ?? swapDefaults.slippageBps;
    const platformFeeBps = opts?.platformFeeBps ?? swapDefaults.platformFeeBps;
    const networkFeeLamports = opts?.networkFeeLamports ?? swapDefaults.networkFeeLamports;

    const minOutputAmount = estimatedOutputAmount * (1 - slippageBps / 10_000);
    const platformFee = estimatedOutputAmount * platformFeeBps / 10_000;
    const networkFeeSol = networkFeeLamports / 1_000_000_000; // LAMPORTS_PER_SOL simplified constant
    const finalOutputAfterFees = Math.max(estimatedOutputAmount - platformFee - networkFeeSol, 0);

    const quote = {
      id: uuidv4(),
      inputMint: inputMint,
      outputMint: 'SOL',
      amountUsd,
      estimatedOutputAmount,
      minOutputAmount,
      platformFeeBps,
      slippageBps,
      networkFeeLamports,
      platformFeeSol: platformFee,
      finalOutputAfterFees,
      createdAt: Date.now()
    };
    this.quotes.set(quote.id, quote);
    void eventRouter.publish('swap.quote', 'justthetip', quote);

    const tip: TipInitiated = {
      id: uuidv4(),
      senderId,
      recipientId,
      usdAmount: amountUsd,
      solAmount: estimatedOutputAmount,
      status: 'pending',
      reference: uuidv4(),
      senderWallet: getWallet(senderId)?.address,
      recipientWallet: getWallet(recipientId)?.address,
      createdAt: Date.now(),
    };
    this.allTips.set(tip.id, tip);
    return { tip, quote };
  }

  async executeSwap(senderId: string, quoteId: string): Promise<any> {
    if (!hasWallet(senderId)) throw new Error('❌ Sender wallet not registered');
    const quote = this.quotes.get(quoteId);
    if (!quote) throw new Error('Quote not found');
    // Simulated loss of 0.5% (50 bps)
    const simulatedLossBps = 50;
    const realizedOutput = quote.estimatedOutputAmount * (1 - simulatedLossBps / 10_000);
    const failed = simulatedLossBps > quote.slippageBps;
    if (failed) {
      const result = { id: quote.id, status: 'failed', reason: 'Slippage exceeded tolerance' };
      void eventRouter.publish('swap.failed', 'justthetip', result);
      return result;
    }
    const finalOutputAfterFees = Math.max(realizedOutput - (quote.platformFeeSol) - (quote.networkFeeLamports / 1_000_000_000), 0);
    const result = { id: quote.id, status: 'completed', realizedOutput, finalOutputAfterFees };
    void eventRouter.publish('swap.completed', 'justthetip', result);
    return result;
  }
}
