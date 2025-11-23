/**
 * Automated CSV Parser for Casino Gameplay Data
 * 
 * Intelligently parses CSV files from various casino sources and converts
 * them into standardized spin data for analysis.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { eventRouter } from '@tiltcheck/event-router';

export interface ParsedSpinRecord {
  id: string;
  timestamp: number;
  betAmount: number;
  winAmount: number;
  netWin: number;
  gameId?: string;
  roundId?: string;
  symbols?: string[];
  casino: string;
  confidence: number;
}

export interface CSVParseResult {
  success: boolean;
  records: ParsedSpinRecord[];
  errors: string[];
  metadata: {
    originalFile: string;
    rowCount: number;
    parsedCount: number;
    casino: string;
    dateRange: { start: number; end: number } | null;
  };
}

export class AutomatedCSVParser {
  private casinoPatterns = {
    'stake-us': {
      betColumns: ['bet', 'wager', 'stake_amount'],
      winColumns: ['win', 'payout', 'amount_won'],
      timeColumns: ['timestamp', 'created_at', 'game_time', 'date'],
      idColumns: ['id', 'bet_id', 'game_id', 'round_id'],
      gameColumns: ['game', 'game_name', 'game_type'],
      dateFormats: ['ISO', 'Unix', 'US']
    },
    'crown-coins': {
      betColumns: ['bet_amount', 'bet', 'amount'],
      winColumns: ['win_amount', 'win', 'payout'],
      timeColumns: ['time', 'timestamp', 'date_time'],
      idColumns: ['spin_id', 'id', 'transaction_id'],
      gameColumns: ['game_name', 'slot_name'],
      dateFormats: ['ISO', 'US']
    },
    'rollbit': {
      betColumns: ['amount', 'bet_amount', 'wager'],
      winColumns: ['profit', 'win_amount', 'payout'],
      timeColumns: ['created_at', 'timestamp'],
      idColumns: ['id', 'bet_id'],
      gameColumns: ['game'],
      dateFormats: ['ISO']
    }
  };

  async parseCSVFile(filepath: string, casinoHint?: string): Promise<CSVParseResult> {
    const result: CSVParseResult = {
      success: false,
      records: [],
      errors: [],
      metadata: {
        originalFile: path.basename(filepath),
        rowCount: 0,
        parsedCount: 0,
        casino: casinoHint || 'unknown',
        dateRange: null
      }
    };

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        result.errors.push('CSV file must have at least a header and one data row');
        return result;
      }

      result.metadata.rowCount = lines.length - 1;

      // Parse header
      const header = this.parseCSVRow(lines[0]);
      const columnMap = this.mapColumns(header, casinoHint);

      if (!columnMap.bet || !columnMap.win || !columnMap.time) {
        result.errors.push('Could not identify required columns (bet, win, time)');
        return result;
      }

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        try {
          const row = this.parseCSVRow(lines[i]);
          const record = this.parseRowToRecord(row, columnMap, result.metadata.casino, i);
          
          if (record) {
            result.records.push(record);
          } else {
            result.errors.push(`Row ${i}: Could not parse required fields`);
          }
        } catch (error) {
          result.errors.push(`Row ${i}: ${error instanceof Error ? error.message : 'Parse error'}`);
        }
      }

      result.metadata.parsedCount = result.records.length;

      // Calculate date range
      if (result.records.length > 0) {
        const timestamps = result.records.map(r => r.timestamp);
        result.metadata.dateRange = {
          start: Math.min(...timestamps),
          end: Math.max(...timestamps)
        };
      }

      // Detect casino if not provided
      if (!casinoHint) {
        result.metadata.casino = this.detectCasino(header, result.records);
      }

      result.success = result.records.length > 0;

      // Publish import event
      await eventRouter.publish('gameplay.csv.parsed', 'csv-parser', {
        filepath,
        casino: result.metadata.casino,
        recordCount: result.records.length,
        success: result.success,
        errors: result.errors.length
      });

      return result;
    } catch (error) {
      result.errors.push(`File read error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  private parseCSVRow(line: string): string[] {
    // Simple CSV parser that handles quoted fields
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }

  private mapColumns(header: string[], casinoHint?: string): ColumnMapping {
    const mapping: ColumnMapping = {};
    const normalizedHeader = header.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    
    const patterns = casinoHint ? this.casinoPatterns[casinoHint as keyof typeof this.casinoPatterns] : null;

    // Find bet column
    for (let i = 0; i < normalizedHeader.length; i++) {
      const col = normalizedHeader[i];
      const betPatterns = patterns?.betColumns || ['bet', 'wager', 'amount', 'stake'];
      if (betPatterns.some(pattern => col.includes(pattern))) {
        mapping.bet = i;
        break;
      }
    }

    // Find win column
    for (let i = 0; i < normalizedHeader.length; i++) {
      const col = normalizedHeader[i];
      const winPatterns = patterns?.winColumns || ['win', 'payout', 'profit', 'amount_won'];
      if (winPatterns.some(pattern => col.includes(pattern))) {
        mapping.win = i;
        break;
      }
    }

    // Find timestamp column
    for (let i = 0; i < normalizedHeader.length; i++) {
      const col = normalizedHeader[i];
      const timePatterns = patterns?.timeColumns || ['time', 'date', 'timestamp', 'created'];
      if (timePatterns.some(pattern => col.includes(pattern))) {
        mapping.time = i;
        break;
      }
    }

    // Find ID column (optional)
    for (let i = 0; i < normalizedHeader.length; i++) {
      const col = normalizedHeader[i];
      const idPatterns = patterns?.idColumns || ['id', 'bet_id', 'game_id', 'round_id'];
      if (idPatterns.some(pattern => col.includes(pattern))) {
        mapping.id = i;
        break;
      }
    }

    // Find game column (optional)
    for (let i = 0; i < normalizedHeader.length; i++) {
      const col = normalizedHeader[i];
      const gamePatterns = patterns?.gameColumns || ['game', 'slot', 'game_name'];
      if (gamePatterns.some(pattern => col.includes(pattern))) {
        mapping.game = i;
        break;
      }
    }

    return mapping;
  }

  private parseRowToRecord(row: string[], mapping: ColumnMapping, casino: string, rowIndex: number): ParsedSpinRecord | null {
    try {
      // Extract required fields
      const betAmount = this.parseNumber(row[mapping.bet!]);
      const winAmount = this.parseNumber(row[mapping.win!]);
      const timestamp = this.parseTimestamp(row[mapping.time!]);

      if (betAmount === null || winAmount === null || timestamp === null) {
        return null;
      }

      // Extract optional fields
      const id = mapping.id ? row[mapping.id] || `row_${rowIndex}` : `row_${rowIndex}`;
      const gameId = mapping.game ? row[mapping.game] : undefined;

      return {
        id,
        timestamp,
        betAmount,
        winAmount,
        netWin: winAmount - betAmount,
        gameId,
        casino,
        confidence: this.calculateConfidence(betAmount, winAmount, timestamp, id)
      };
    } catch (error) {
      return null;
    }
  }

  private parseNumber(value: string): number | null {
    if (!value || value.trim() === '') return null;
    
    // Remove currency symbols and commas
    const cleaned = value.replace(/[$,€£¥]/g, '').trim();
    const num = parseFloat(cleaned);
    
    return isNaN(num) ? null : num;
  }

  private parseTimestamp(value: string): number | null {
    if (!value || value.trim() === '') return null;

    // Try different timestamp formats
    const cleanValue = value.trim();

    // Unix timestamp (seconds or milliseconds)
    if (/^\d{10}$/.test(cleanValue)) {
      return parseInt(cleanValue) * 1000; // seconds to milliseconds
    }
    if (/^\d{13}$/.test(cleanValue)) {
      return parseInt(cleanValue); // already milliseconds
    }

    // ISO date format
    const isoDate = Date.parse(cleanValue);
    if (!isNaN(isoDate)) {
      return isoDate;
    }

    // US date format (MM/DD/YYYY)
    const usDateMatch = cleanValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(.+))?$/);
    if (usDateMatch) {
      const [, month, day, year, time] = usDateMatch;
      const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}${time ? ` ${time}` : ''}`;
      const date = Date.parse(dateStr);
      if (!isNaN(date)) return date;
    }

    return null;
  }

  private calculateConfidence(betAmount: number, winAmount: number, timestamp: number, id: string): number {
    let confidence = 0.5; // Base confidence
    
    if (betAmount > 0) confidence += 0.2;
    if (winAmount >= 0) confidence += 0.2;
    if (timestamp > 0) confidence += 0.2;
    if (id && id.trim() !== '') confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private detectCasino(header: string[], records: ParsedSpinRecord[]): string {
    const headerStr = header.join(' ').toLowerCase();
    
    // Check for casino-specific column names
    if (headerStr.includes('stake') || headerStr.includes('wager')) {
      return 'stake-us';
    }
    if (headerStr.includes('crown') || headerStr.includes('sc_amount')) {
      return 'crown-coins';
    }
    if (headerStr.includes('profit') && headerStr.includes('rollbit')) {
      return 'rollbit';
    }

    // Check betting patterns
    if (records.length > 0) {
      const avgBet = records.reduce((sum, r) => sum + r.betAmount, 0) / records.length;
      
      // Crown Coins typically has lower bet amounts (SC)
      if (avgBet < 5) {
        return 'crown-coins';
      }
      // Stake.us typically has higher amounts (USD)
      if (avgBet > 10) {
        return 'stake-us';
      }
    }

    return 'unknown';
  }

  // Batch process multiple CSV files
  async batchProcessDirectory(dirPath: string, casinoHint?: string): Promise<CSVParseResult[]> {
    const results: CSVParseResult[] = [];
    
    try {
      const files = await fs.readdir(dirPath);
      const csvFiles = files.filter(f => f.endsWith('.csv'));
      
      for (const file of csvFiles) {
        const filepath = path.join(dirPath, file);
        console.log(`[CSVParser] Processing: ${file}`);
        
        const result = await this.parseCSVFile(filepath, casinoHint);
        results.push(result);
        
        if (result.success) {
          console.log(`[CSVParser] Success: ${result.records.length} records from ${file}`);
        } else {
          console.log(`[CSVParser] Failed: ${file} - ${result.errors.join(', ')}`);
        }
      }
    } catch (error) {
      console.error('[CSVParser] Directory processing error:', error);
    }
    
    return results;
  }

  // Export parsed data to standardized JSON format
  async exportToJSON(records: ParsedSpinRecord[], outputPath: string): Promise<void> {
    const exportData = {
      exportTimestamp: Date.now(),
      recordCount: records.length,
      records: records.sort((a, b) => a.timestamp - b.timestamp)
    };
    
    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`[CSVParser] Exported ${records.length} records to ${outputPath}`);
  }
}

interface ColumnMapping {
  bet?: number;
  win?: number;
  time?: number;
  id?: number;
  game?: number;
}

// Export singleton instance
export const csvParser = new AutomatedCSVParser();