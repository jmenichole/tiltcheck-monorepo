/**
 * @tiltcheck/pricing-oracle
 * Lightweight in-memory pricing oracle with manual overrides and optional remote fetch.
 * Default remote source: CoinGecko Simple Price API.
 * Tests can call setUsdPrice for deterministic behavior.
 */
import fetch from 'node-fetch';

interface PriceEntry {
  usd: number;
  lastUpdated: number; // ms epoch
}

const CACHE_TTL_MS = 60_000; // 60s
const REMOTE_DISABLED = process.env.PRICING_ORACLE_DISABLE_REMOTE === 'true';

// Map token symbol -> coingecko id
const COINGECKO_IDS: Record<string, string> = {
  SOL: 'solana',
  USDC: 'usd-coin',
  BTC: 'bitcoin',
  ETH: 'ethereum'
};

const store: Map<string, PriceEntry> = new Map();

function now() { return Date.now(); }

async function fetchRemoteUsdPrice(symbol: string): Promise<number> {
  if (REMOTE_DISABLED) throw new Error('Remote pricing disabled by env');
  const id = COINGECKO_IDS[symbol.toUpperCase()];
  if (!id) throw new Error(`No remote id mapping for symbol ${symbol}`);
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Remote pricing fetch failed ${res.status}`);
  const json: any = await res.json();
  const price = json[id]?.usd;
  if (typeof price !== 'number') throw new Error('Invalid remote price payload');
  return price;
}

export const pricingOracle = {
  setUsdPrice(symbol: string, price: number) {
    store.set(symbol.toUpperCase(), { usd: price, lastUpdated: now() });
  },
  getUsdPrice(symbol: string): number {
    const key = symbol.toUpperCase();
    const entry = store.get(key);
    if (!entry) return 0;
    return entry.usd;
  },
  async ensurePrice(symbol: string): Promise<number> {
    const key = symbol.toUpperCase();
    const entry = store.get(key);
    if (entry && now() - entry.lastUpdated < CACHE_TTL_MS) return entry.usd;
    const remote = await fetchRemoteUsdPrice(key);
    pricingOracle.setUsdPrice(key, remote);
    return remote;
  },
  async preload(symbols: string[]): Promise<void> {
    for (const s of symbols) {
      try { await pricingOracle.ensurePrice(s); } catch { /* ignore */ }
    }
  },
  convertUsdToSol(usd: number): number {
    const solPrice = pricingOracle.getUsdPrice('SOL');
    if (!solPrice) return 0;
    return usd / solPrice;
  },
  convertSolToUsd(sol: number): number {
    const solPrice = pricingOracle.getUsdPrice('SOL');
    if (!solPrice) return 0;
    return sol * solPrice;
  }
};

export type PricingOracle = typeof pricingOracle;
