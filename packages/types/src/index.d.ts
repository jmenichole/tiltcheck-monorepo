/**
 * TiltCheck Shared Types
 * Core type definitions used across the ecosystem
 */
export type EventType = 'tip.requested' | 'tip.initiated' | 'tip.pending' | 'tip.pending.resolved' | 'tip.sent' | 'tip.confirmed' | 'tip.completed' | 'tip.failed' | 'tip.expired' | 'tip.ready' | 'airdrop.requested' | 'airdrop.confirmed' | 'airdrop.completed' | 'airdrop.failed' | 'swap.requested' | 'swap.quote' | 'swap.completed' | 'swap.failed' | 'wallet.registered' | 'wallet.disconnected' | 'price.updated' | 'link.scanned' | 'link.flagged' | 'promo.submitted' | 'promo.approved' | 'promo.denied' | 'bonus.logged' | 'bonus.nerfed' | 'bonus.claimed' | 'bonus.updated' | 'bonus.nerf.detected' | 'bonus.prediction.generated' | 'trust.casino.updated' | 'trust.domain.updated' | 'trust.degen.updated' | 'trust.domain.rollup' | 'trust.casino.rollup' | 'trust.state.requested' | 'trust.state.snapshot' | 'tilt.detected' | 'tilt.cooldown.requested' | 'cooldown.violated' | 'scam.reported' | 'accountability.success' | 'survey.matched' | 'game.started' | 'game.completed' | 'vault.locked' | 'vault.extended' | 'vault.unlocked';
export interface TiltCheckEvent<T = any> {
    id: string;
    type: EventType;
    timestamp: number;
    source: ModuleId;
    userId?: string;
    data: T;
    metadata?: Record<string, any>;
}
export type ModuleId = 'tiltcheck' | 'tiltcheck-core' | 'suslink' | 'collectclock' | 'freespinscan' | 'justthetip' | 'pricing-oracle' | 'trust-engine-casino' | 'trust-engine-degen' | 'trust-rollup' | 'poker-module' | 'discord-bot' | 'lockvault';
export interface User {
    id: string;
    walletAddress?: string;
    createdAt: Date;
    updatedAt: Date;
    trustScore: number;
    nftId?: string;
    notes?: string;
}
export interface WalletMapping {
    discordId: string;
    walletAddress: string;
    provider: 'magic' | 'user-supplied';
    createdAt: Date;
}
export interface TrustEvent {
    id: number;
    userId?: string;
    casinoName?: string;
    eventType: string;
    delta?: number;
    severity?: number;
    previousScore?: number;
    newScore?: number;
    reason: string;
    source: string;
    details?: string;
    createdAt: Date;
}
export interface TrustCasinoUpdateEvent {
    casinoName: string;
    previousScore?: number;
    newScore?: number;
    severity?: number;
    delta?: number;
    reason: string;
    source: string;
    metadata?: Record<string, any>;
}
export interface TrustDegenUpdateEvent {
    userId: string;
    previousScore?: number;
    newScore?: number;
    delta?: number;
    severity?: number;
    reason: string;
    source: string;
    metadata?: Record<string, any>;
}
export type DomainRiskCategory = 'safe' | 'unknown' | 'suspicious' | 'unsafe' | 'malicious';
export interface TrustDomainUpdateEvent {
    domain: string;
    previousScore?: number;
    newScore?: number;
    severity?: number;
    delta?: number;
    category: DomainRiskCategory;
    reason: string;
    source: string;
    metadata?: Record<string, any>;
}
export interface TrustScore {
    score: number;
    level: 'very-high' | 'high' | 'neutral' | 'low' | 'high-risk';
    lastUpdated: Date;
    explanation?: string;
}
export interface TipRequest {
    fromUser: string;
    toUser: string;
    amount: number;
    token: string;
}
export interface TipResult {
    success: boolean;
    fee: number;
    txSignature?: string;
    error?: string;
}
export interface SwapRequest {
    userId: string;
    fromToken: string;
    toToken: string;
    amount: number;
}
export interface SwapQuote {
    userId: string;
    inputMint: string;
    outputMint: string;
    inputAmount: number;
    estimatedOutputAmount: number;
    rate: number;
    slippageBps: number;
    generatedAt: number;
    routePlan?: any;
    minOutputAmount: number;
    platformFeeBps: number;
    networkFeeLamports: number;
    finalOutputAfterFees: number;
}
export interface SwapExecution {
    quote: SwapQuote;
    txId: string;
    status: 'pending' | 'completed' | 'failed';
    completedAt?: number;
}
export interface PriceUpdateEvent {
    token: string;
    oldPrice?: number;
    newPrice: number;
    updatedAt: number;
    stale?: boolean;
}
export declare const FLAT_FEE = 0.07;
export type RiskLevel = 'safe' | 'suspicious' | 'high' | 'critical';
export interface LinkScanResult {
    url: string;
    riskLevel: RiskLevel;
    redirectChain?: string[];
    domainAgeDays?: number;
    reason: string;
    scannedAt: Date;
}
export interface Bonus {
    id: number;
    casinoName: string;
    userId: string;
    amount: number;
    timestamp: Date;
    nerfed: boolean;
    notes?: string;
}
export interface BonusPrediction {
    casinoName: string;
    predictedTimestamp: Date;
    confidence: number;
    createdAt: Date;
}
export interface BonusClaimEvent {
    casinoName: string;
    userId: string;
    amount: number;
    claimedAt: number;
    nextEligibleAt: number;
}
export interface BonusUpdateEvent {
    casinoName: string;
    oldAmount?: number;
    newAmount: number;
    updatedAt: number;
}
export interface BonusNerfDetectedEvent {
    casinoName: string;
    previousAmount: number;
    newAmount: number;
    delta: number;
    percentDrop: number;
    detectedAt: number;
}
export interface BonusPredictionGeneratedEvent {
    casinoName: string;
    predictedAmount: number;
    confidence: number;
    basisSampleSize: number;
    generatedAt: number;
    volatility?: number;
    volatilityScore?: number;
}
export interface PromoSubmission {
    id: number;
    url: string;
    userId: string;
    casinoName: string;
    bonusType: string;
    notes?: string;
    suslinkScore?: number;
    status: 'pending' | 'approved' | 'denied';
    createdAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
}
export interface TiltSignal {
    userId: string;
    signalType: 'speed' | 'rage' | 'loan-request' | 'aggressive-chat';
    severity: number;
    createdAt: Date;
}
export interface Cooldown {
    userId: string;
    reason: string;
    startedAt: Date;
    endsAt: Date;
}
export interface APIResponse<T = any> {
    status: 'ok' | 'error';
    data?: T;
    error?: string;
    message?: string;
}
export interface DiscordCommand {
    name: string;
    userId: string;
    guildId?: string;
    channelId: string;
    options?: Record<string, any>;
    timestamp: Date;
}
export type EventHandler<T = any> = (event: TiltCheckEvent<T>) => Promise<void> | void;
export interface EventSubscription {
    eventType: EventType;
    handler: EventHandler;
    moduleId: ModuleId;
}
//# sourceMappingURL=index.d.ts.map