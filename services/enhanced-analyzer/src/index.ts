/**
 * Enhanced Gameplay Analyzer - WebSocket-based Spin Detection
 * 
 * Improved real-time gameplay analysis with:
 * - Enhanced WebSocket protocol for live data
 * - Automated pattern detection
 * - CSV import automation
 * - Better tilt detection
 */

import { WebSocketServer } from 'ws';
import { eventRouter } from '@tiltcheck/event-router';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface EnhancedSpinData {
  id: string;
  timestamp: number;
  betAmount: number;
  winAmount: number;
  gameId?: string;
  roundId?: string;
  symbols?: string[];
  source: 'manual' | 'websocket' | 'csv' | 'screen';
  confidence: number;
}

export interface AutomatedAnalysisSession {
  userId: string;
  sessionId: string;
  casinoId: string;
  startTime: number;
  spins: EnhancedSpinData[];
  metrics: {
    totalBet: number;
    totalWin: number;
    spinCount: number;
    rtp: number;
    lastActivity: number;
  };
  patterns: {
    rapidBetting: number;
    increasingBets: number;
    extendedSession: boolean;
    tiltIndicators: number;
  };
}

export class EnhancedGameplayAnalyzer {
  private wsServer: WebSocketServer;
  private activeSessions = new Map<string, AutomatedAnalysisSession>();
  private csvWatcher: any;

  constructor() {
    this.wsServer = new WebSocketServer({ 
      port: parseInt(process.env.ENHANCED_ANALYZER_WS_PORT || '7074') 
    });
    this.setupWebSocketHandlers();
    this.setupCSVWatcher();
    console.log('[EnhancedAnalyzer] Service started on port 7074');
  }

  private setupWebSocketHandlers() {
    this.wsServer.on('connection', (ws, req) => {
      const url = new URL(req.url!, 'ws://localhost');
      const sessionId = url.searchParams.get('session');
      const userId = url.searchParams.get('userId');

      if (!sessionId || !userId) {
        ws.close(1008, 'Missing session or userId');
        return;
      }

      console.log(`[EnhancedAnalyzer] Client connected: ${userId}/${sessionId}`);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(userId, sessionId, message, ws);
        } catch (error) {
          console.error('[EnhancedAnalyzer] WebSocket message error:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Parse error' 
          }));
        }
      });

      ws.on('close', () => {
        console.log(`[EnhancedAnalyzer] Client disconnected: ${userId}/${sessionId}`);
      });
    });
  }

  private async handleWebSocketMessage(userId: string, sessionId: string, message: any, ws: any) {
    switch (message.type) {
      case 'start_session':
        await this.startSession(userId, sessionId, message.casinoId);
        ws.send(JSON.stringify({ type: 'session_started', sessionId }));
        break;

      case 'spin_data':
        await this.processSpin(sessionId, message.data);
        const session = this.activeSessions.get(sessionId);
        if (session) {
          ws.send(JSON.stringify({ 
            type: 'metrics_update', 
            data: session.metrics 
          }));
          
          // Check for patterns and send alerts
          const alerts = this.checkForAlerts(session);
          if (alerts.length > 0) {
            ws.send(JSON.stringify({ 
              type: 'tilt_alerts', 
              alerts 
            }));
          }
        }
        break;

      case 'batch_import':
        await this.importBatchData(sessionId, message.data);
        break;

      case 'get_session':
        const currentSession = this.activeSessions.get(sessionId);
        if (currentSession) {
          ws.send(JSON.stringify({ 
            type: 'session_data', 
            data: currentSession 
          }));
        }
        break;

      case 'end_session':
        await this.endSession(sessionId);
        ws.send(JSON.stringify({ type: 'session_ended' }));
        break;
    }
  }

  async startSession(userId: string, sessionId: string, casinoId: string) {
    const session: AutomatedAnalysisSession = {
      userId,
      sessionId,
      casinoId,
      startTime: Date.now(),
      spins: [],
      metrics: {
        totalBet: 0,
        totalWin: 0,
        spinCount: 0,
        rtp: 0,
        lastActivity: Date.now()
      },
      patterns: {
        rapidBetting: 0,
        increasingBets: 0,
        extendedSession: false,
        tiltIndicators: 0
      }
    };

    this.activeSessions.set(sessionId, session);

    // Publish to event system
    await eventRouter.publish('gameplay.session.started', 'enhanced-analyzer', {
      userId,
      sessionId,
      casinoId,
      timestamp: Date.now()
    });

    console.log(`[EnhancedAnalyzer] Session started: ${userId}/${sessionId} (${casinoId})`);
  }

  async processSpin(sessionId: string, spinData: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const enhancedSpin: EnhancedSpinData = {
      id: spinData.id || `spin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: spinData.timestamp || Date.now(),
      betAmount: parseFloat(spinData.betAmount) || 0,
      winAmount: parseFloat(spinData.winAmount) || 0,
      gameId: spinData.gameId,
      roundId: spinData.roundId,
      symbols: spinData.symbols,
      source: spinData.source || 'websocket',
      confidence: spinData.confidence || 1.0
    };

    // Validate spin data
    if (enhancedSpin.betAmount <= 0) {
      console.warn('[EnhancedAnalyzer] Invalid bet amount:', enhancedSpin.betAmount);
      return;
    }

    // Add to session
    session.spins.push(enhancedSpin);
    
    // Update metrics
    session.metrics.totalBet += enhancedSpin.betAmount;
    session.metrics.totalWin += enhancedSpin.winAmount;
    session.metrics.spinCount++;
    session.metrics.rtp = session.metrics.totalBet > 0 ? session.metrics.totalWin / session.metrics.totalBet : 0;
    session.metrics.lastActivity = enhancedSpin.timestamp;

    // Detect patterns
    this.detectPatterns(session, enhancedSpin);

    // Publish spin event
    await eventRouter.publish('gameplay.spin.processed', 'enhanced-analyzer', {
      userId: session.userId,
      sessionId: session.sessionId,
      casinoId: session.casinoId,
      spin: enhancedSpin,
      metrics: session.metrics
    });

    console.log(`[EnhancedAnalyzer] Processed spin: ${enhancedSpin.betAmount} -> ${enhancedSpin.winAmount} (Session: ${sessionId})`);
  }

  private detectPatterns(session: AutomatedAnalysisSession, newSpin: EnhancedSpinData) {
    const now = Date.now();
    const recentSpins = session.spins.slice(-10); // Last 10 spins

    // Rapid betting detection (< 2 seconds between spins)
    if (session.spins.length > 1) {
      const timeBetween = newSpin.timestamp - session.spins[session.spins.length - 2].timestamp;
      if (timeBetween < 2000) {
        session.patterns.rapidBetting++;
      }
    }

    // Increasing bet pattern (3+ consecutive increases)
    if (recentSpins.length >= 3) {
      const last3Bets = recentSpins.slice(-3).map(s => s.betAmount);
      if (last3Bets[0] < last3Bets[1] && last3Bets[1] < last3Bets[2]) {
        session.patterns.increasingBets++;
      }
    }

    // Extended session detection (> 2 hours)
    const sessionDuration = now - session.startTime;
    if (sessionDuration > 2 * 60 * 60 * 1000) {
      session.patterns.extendedSession = true;
    }

    // Tilt indicators (rapid betting + increasing bets)
    if (session.patterns.rapidBetting > 5 && session.patterns.increasingBets > 2) {
      session.patterns.tiltIndicators++;
    }
  }

  private checkForAlerts(session: AutomatedAnalysisSession): any[] {
    const alerts = [];

    if (session.patterns.rapidBetting > 10) {
      alerts.push({
        type: 'rapid_betting',
        severity: 'high',
        message: 'Detected rapid betting pattern - consider taking a break',
        count: session.patterns.rapidBetting
      });
    }

    if (session.patterns.increasingBets > 5) {
      alerts.push({
        type: 'increasing_bets',
        severity: 'medium',
        message: 'Bet amounts are increasing consistently',
        count: session.patterns.increasingBets
      });
    }

    if (session.patterns.extendedSession) {
      alerts.push({
        type: 'extended_session',
        severity: 'medium',
        message: 'Long gaming session detected - time for a break?',
        duration: Date.now() - session.startTime
      });
    }

    if (session.metrics.rtp < 0.5 && session.metrics.spinCount > 20) {
      alerts.push({
        type: 'low_rtp',
        severity: 'high',
        message: `RTP is ${(session.metrics.rtp * 100).toFixed(1)}% - unusually low`,
        rtp: session.metrics.rtp
      });
    }

    return alerts;
  }

  async importBatchData(sessionId: string, data: any[]): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    for (const item of data) {
      await this.processSpin(sessionId, {
        ...item,
        source: 'csv',
        confidence: 0.9
      });
    }

    console.log(`[EnhancedAnalyzer] Imported ${data.length} spins for session ${sessionId}`);
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const duration = Date.now() - session.startTime;
    const summary = {
      userId: session.userId,
      sessionId: session.sessionId,
      casinoId: session.casinoId,
      duration,
      finalMetrics: session.metrics,
      patterns: session.patterns,
      totalSpins: session.spins.length
    };

    // Publish session end event
    await eventRouter.publish('gameplay.session.ended', 'enhanced-analyzer', summary);

    // Save session data to file
    await this.saveSessionData(session);

    this.activeSessions.delete(sessionId);
    console.log(`[EnhancedAnalyzer] Session ended: ${sessionId}`);
  }

  private async saveSessionData(session: AutomatedAnalysisSession) {
    try {
      const dataDir = path.join(process.cwd(), 'data', 'analysis-sessions');
      await fs.mkdir(dataDir, { recursive: true });
      
      const filename = `${session.sessionId}_${Date.now()}.json`;
      const filepath = path.join(dataDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(session, null, 2));
      console.log(`[EnhancedAnalyzer] Session data saved: ${filepath}`);
    } catch (error) {
      console.error('[EnhancedAnalyzer] Failed to save session data:', error);
    }
  }

  private setupCSVWatcher() {
    // Monitor for CSV files dropped in watch directory
    const watchDir = path.join(process.cwd(), 'data', 'csv-imports');
    
    try {
      // Create watch directory if it doesn't exist
      fs.mkdir(watchDir, { recursive: true }).catch(() => {});
      
      // Simple polling-based file watcher
      setInterval(async () => {
        try {
          const files = await fs.readdir(watchDir);
          const csvFiles = files.filter(f => f.endsWith('.csv'));
          
          for (const file of csvFiles) {
            await this.processCSVFile(path.join(watchDir, file));
          }
        } catch (error) {
          // Directory might not exist yet
        }
      }, 5000);
      
      console.log(`[EnhancedAnalyzer] CSV watcher monitoring: ${watchDir}`);
    } catch (error) {
      console.warn('[EnhancedAnalyzer] CSV watcher setup failed:', error);
    }
  }

  private async processCSVFile(filepath: string): Promise<void> {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) return; // Need header + at least 1 data line
      
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const spins: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const spin: any = {};
        
        header.forEach((col, index) => {
          if (values[index]) {
            if (col.includes('bet') || col.includes('amount')) {
              spin.betAmount = parseFloat(values[index]);
            } else if (col.includes('win') || col.includes('payout')) {
              spin.winAmount = parseFloat(values[index]);
            } else if (col.includes('time') || col.includes('date')) {
              spin.timestamp = new Date(values[index]).getTime();
            } else if (col.includes('id')) {
              spin.id = values[index];
            }
          }
        });
        
        if (spin.betAmount && spin.winAmount !== undefined) {
          spins.push(spin);
        }
      }
      
      // Try to find active session or create temporary one
      const sessionId = `csv_import_${Date.now()}`;
      if (spins.length > 0) {
        console.log(`[EnhancedAnalyzer] Auto-processing CSV: ${filepath} (${spins.length} spins)`);
        
        // Publish CSV import event
        await eventRouter.publish('gameplay.csv.imported', 'enhanced-analyzer', {
          filepath,
          spinCount: spins.length,
          timestamp: Date.now()
        });
      }
      
      // Move processed file to archive
      const archiveDir = path.join(path.dirname(filepath), 'processed');
      await fs.mkdir(archiveDir, { recursive: true });
      const archivePath = path.join(archiveDir, path.basename(filepath));
      await fs.rename(filepath, archivePath);
      
    } catch (error) {
      console.error(`[EnhancedAnalyzer] CSV processing error (${filepath}):`, error);
    }
  }

  // Get active sessions for monitoring
  getActiveSessions(): AutomatedAnalysisSession[] {
    return Array.from(this.activeSessions.values());
  }

  // Get session by ID
  getSession(sessionId: string): AutomatedAnalysisSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  // Cleanup
  async shutdown() {
    console.log('[EnhancedAnalyzer] Shutting down...');
    this.wsServer.close();
    
    // Save all active sessions
    for (const session of this.activeSessions.values()) {
      await this.saveSessionData(session);
    }
  }
}

// Export singleton instance (respect BUILD_SKIP_LISTEN to avoid port binding during CI/type-check)
let enhancedAnalyzer: EnhancedGameplayAnalyzer | undefined;
if (process.env.BUILD_SKIP_LISTEN === '1') {
  console.log('[EnhancedAnalyzer] BUILD_SKIP_LISTEN=1 set, skipping server listen.');
} else {
  enhancedAnalyzer = new EnhancedGameplayAnalyzer();
}
export { enhancedAnalyzer };