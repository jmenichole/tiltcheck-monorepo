/**
 * Casino Data Utility
 * 
 * Loads casino information from the centralized casino database
 * for use across TiltCheck services
 */

import fs from 'fs';
import path from 'path';

export interface CasinoInfo {
  id: string;
  name: string;
  baseURL: string;
  endpoints?: {
    fairness?: string;
    provablyFair?: string;
    games?: string;
    bonus?: string;
  };
  platforms?: {
    reddit?: string;
    trustpilot?: string;
    discord?: string;
  };
  regulator?: string;
  enabled: boolean;
  lastCollected?: string | null;
  bonusInfo?: {
    dailyBonus?: number;
    currency?: 'SC' | 'GC' | 'USD';
    cooldownHours?: number;
    requiresDeposit?: boolean;
  };
}

export interface CasinoDatabase {
  casinos: CasinoInfo[];
}

/**
 * Load casino database from JSON file
 */
export async function loadCasinosData(): Promise<CasinoInfo[]> {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'casinos.json');
    const rawData = await fs.promises.readFile(dataPath, 'utf8');
    const data: CasinoDatabase = JSON.parse(rawData);
    return data.casinos || [];
  } catch (error) {
    console.warn('[CasinoData] Failed to load casino database:', error);
    return [];
  }
}

/**
 * Load casino database synchronously
 */
export function loadCasinosDataSync(): CasinoInfo[] {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'casinos.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data: CasinoDatabase = JSON.parse(rawData);
    return data.casinos || [];
  } catch (error) {
    console.warn('[CasinoData] Failed to load casino database:', error);
    return [];
  }
}

/**
 * Get a specific casino by ID
 */
export function getCasino(casinoId: string, casinos?: CasinoInfo[]): CasinoInfo | null {
  const casinoList = casinos || loadCasinosDataSync();
  return casinoList.find(casino => 
    casino.id.toLowerCase() === casinoId.toLowerCase() ||
    casino.name.toLowerCase() === casinoId.toLowerCase()
  ) || null;
}

/**
 * Get all enabled casinos
 */
export function getEnabledCasinos(casinos?: CasinoInfo[]): CasinoInfo[] {
  const casinoList = casinos || loadCasinosDataSync();
  return casinoList.filter(casino => casino.enabled);
}

/**
 * Search casinos by name (fuzzy matching)
 */
export function searchCasinos(query: string, casinos?: CasinoInfo[]): CasinoInfo[] {
  const casinoList = casinos || loadCasinosDataSync();
  const lowQuery = query.toLowerCase();
  
  return casinoList
    .filter(casino => 
      casino.name.toLowerCase().includes(lowQuery) ||
      casino.id.toLowerCase().includes(lowQuery)
    )
    .sort((a, b) => {
      // Prioritize exact matches and enabled casinos
      const aExact = a.id.toLowerCase() === lowQuery || a.name.toLowerCase() === lowQuery;
      const bExact = b.id.toLowerCase() === lowQuery || b.name.toLowerCase() === lowQuery;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      if (a.enabled && !b.enabled) return -1;
      if (!a.enabled && b.enabled) return 1;
      return 0;
    });
}

/**
 * Get casino choices for Discord command options
 */
export function getCasinoChoices(maxChoices: number = 25): Array<{ name: string; value: string }> {
  const casinos = getEnabledCasinos();
  
  return casinos
    .slice(0, maxChoices)
    .map(casino => ({
      name: `${casino.name} (${casino.id})`,
      value: casino.id
    }));
}

/**
 * Format casino information for display
 */
export function formatCasinoInfo(casino: CasinoInfo): string {
  let info = `**${casino.name}** (\`${casino.id}\`)`;
  
  if (casino.regulator) {
    info += `\n• Regulator: ${casino.regulator}`;
  }
  
  if (casino.bonusInfo) {
    const bonus = casino.bonusInfo;
    info += `\n• Daily Bonus: ${bonus.dailyBonus} ${bonus.currency || 'SC'}`;
    if (bonus.cooldownHours) {
      info += ` (${bonus.cooldownHours}h cooldown)`;
    }
  }
  
  if (casino.platforms?.reddit) {
    info += `\n• Reddit: ${casino.platforms.reddit}`;
  }
  
  info += `\n• Status: ${casino.enabled ? '✅ Active' : '❌ Disabled'}`;
  
  return info;
}

/**
 * Update casino database (for admin operations)
 */
export async function updateCasinoDatabase(casinos: CasinoInfo[]): Promise<void> {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'casinos.json');
    const data: CasinoDatabase = { casinos };
    await fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('[CasinoData] Casino database updated successfully');
  } catch (error) {
    console.error('[CasinoData] Failed to update casino database:', error);
    throw error;
  }
}

/**
 * Add new casino to database
 */
export async function addCasino(newCasino: Omit<CasinoInfo, 'lastCollected'>): Promise<void> {
  const casinos = await loadCasinosData();
  const existingIndex = casinos.findIndex(c => c.id === newCasino.id);
  
  if (existingIndex >= 0) {
    // Update existing casino
    casinos[existingIndex] = { ...newCasino, lastCollected: casinos[existingIndex].lastCollected };
  } else {
    // Add new casino
    casinos.push({ ...newCasino, lastCollected: null });
  }
  
  await updateCasinoDatabase(casinos);
}

/**
 * Get casino statistics
 */
export function getCasinoStats(casinos?: CasinoInfo[]): {
  total: number;
  enabled: number;
  disabled: number;
  withBonusInfo: number;
  regulators: { [key: string]: number };
} {
  const casinoList = casinos || loadCasinosDataSync();
  
  const stats = {
    total: casinoList.length,
    enabled: casinoList.filter(c => c.enabled).length,
    disabled: casinoList.filter(c => !c.enabled).length,
    withBonusInfo: casinoList.filter(c => c.bonusInfo).length,
    regulators: {} as { [key: string]: number }
  };
  
  casinoList.forEach(casino => {
    if (casino.regulator) {
      stats.regulators[casino.regulator] = (stats.regulators[casino.regulator] || 0) + 1;
    }
  });
  
  return stats;
}