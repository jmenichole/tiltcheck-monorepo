/**
 * Analysis Integration Service
 * 
 * Coordinates between CSV parser, WebSocket analyzer, visual recognition,
 * and Discord bot for seamless automated analysis.
 */

import { WebSocketServer } from 'ws';
import { csvParser } from './csv-parser.js';
import { visualRecognizer } from './visual-recognition.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AnalysisSession {
  sessionId: string;
  userId: string;
  casinoId: string;
  startTime: number;
  analysisMode: 'csv' | 'websocket' | 'visual' | 'hybrid';
  status: 'active' | 'paused' | 'completed';
  metrics: SessionMetrics;
  tiltAlerts: TiltAlert[];
}

export interface SessionMetrics {
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  sessionDuration: number;
  averageBetSize: number;
  largestBet: number;
  longestLossStreak: number;
  currentStreak: number;
  rapidBetCount: number;
  bankruptcyRisk: number;
}

export interface TiltAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  confidence: number;
  actionTaken?: string;
}

export class AnalysisIntegrationService {
  private sessions = new Map<string, AnalysisSession>();
  private wss: WebSocketServer;
  private eventHandlers = new Map<string, Function>();
  
  constructor() {
    this.wss = new WebSocketServer({ port: 7075 });
    this.setupWebSocketHandlers();
    console.log('[AnalysisIntegration] Service started on port 7075');
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('sessionId');
      const userId = url.searchParams.get('userId');
      
      console.log(`[AnalysisIntegration] New connection: session=${sessionId}, user=${userId}`);
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(ws, message, sessionId, userId);
        } catch (error) {
          console.error('[AnalysisIntegration] Message error:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        console.log(`[AnalysisIntegration] Connection closed: session=${sessionId}`);
        if (sessionId) {
          this.pauseSession(sessionId);
        }
      });
    });
  }

  private async handleWebSocketMessage(ws: any, message: any, sessionId: string | null, userId: string | null) {
    const { type, data } = message;

    switch (type) {
      case 'start_session':
        if (!userId || !data.casinoId) {
          ws.send(JSON.stringify({ error: 'userId and casinoId required' }));
          return;
        }
        
        const session = await this.startSession(userId, data.casinoId, data.analysisMode || 'hybrid');
        ws.send(JSON.stringify({ 
          type: 'session_started', 
          sessionId: session.sessionId,
          data: session 
        }));
        break;

      case 'upload_csv':
        if (!sessionId || !data.csvData) {
          ws.send(JSON.stringify({ error: 'sessionId and csvData required' }));
          return;
        }
        
        const csvResults = await this.processCSVData(sessionId, data.csvData, data.casinoId);
        ws.send(JSON.stringify({ 
          type: 'csv_processed', 
          data: csvResults 
        }));
        break;

      case 'upload_screenshot':
        if (!sessionId || !data.imageData) {
          ws.send(JSON.stringify({ error: 'sessionId and imageData required' }));
          return;
        }
        
        const visualResults = await this.processScreenshot(sessionId, data.imageData, data.casinoId);
        ws.send(JSON.stringify({ 
          type: 'screenshot_analyzed', 
          data: visualResults 
        }));
        break;

      case 'bet_placed':
        if (!sessionId) {
          ws.send(JSON.stringify({ error: 'sessionId required' }));
          return;
        }
        
        await this.recordBet(sessionId, data);
        const updatedSession = this.sessions.get(sessionId);
        ws.send(JSON.stringify({ 
          type: 'bet_recorded', 
          data: updatedSession?.metrics 
        }));
        break;

      case 'get_session_status':
        if (!sessionId) {
          ws.send(JSON.stringify({ error: 'sessionId required' }));
          return;
        }
        
        const currentSession = this.sessions.get(sessionId);
        ws.send(JSON.stringify({ 
          type: 'session_status', 
          data: currentSession 
        }));
        break;

      default:
        ws.send(JSON.stringify({ error: `Unknown message type: ${type}` }));
    }
  }

  async startSession(userId: string, casinoId: string, analysisMode: string = 'hybrid'): Promise<AnalysisSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: AnalysisSession = {
      sessionId,
      userId,
      casinoId,
      startTime: Date.now(),
      analysisMode: analysisMode as any,
      status: 'active',
      metrics: {
        totalBets: 0,
        totalWagered: 0,
        totalWon: 0,
        sessionDuration: 0,
        averageBetSize: 0,
        largestBet: 0,
        longestLossStreak: 0,
        currentStreak: 0,
        rapidBetCount: 0,
        bankruptcyRisk: 0
      },
      tiltAlerts: []
    };

    this.sessions.set(sessionId, session);
    console.log(`[AnalysisIntegration] Started session ${sessionId} for user ${userId} at ${casinoId}`);
    
    // Notify other services
    await this.publishEvent('session_started', session);
    
    return session;
  }

  async processCSVData(sessionId: string, csvData: string, casinoId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    console.log(`[AnalysisIntegration] Processing CSV for session ${sessionId}`);
    
    const parseResult = await csvParser.parseCSVContent(csvData, casinoId);
    
    if (parseResult.success && parseResult.parsedData) {
      // Update session metrics with CSV data
      const bets = parseResult.parsedData.bets;
      session.metrics.totalBets += bets.length;
      session.metrics.totalWagered += bets.reduce((sum, bet) => sum + bet.betAmount, 0);
      session.metrics.totalWon += bets.reduce((sum, bet) => sum + bet.winAmount, 0);
      
      // Calculate additional metrics
      const betAmounts = bets.map(b => b.betAmount);
      session.metrics.averageBetSize = betAmounts.reduce((a, b) => a + b, 0) / betAmounts.length;
      session.metrics.largestBet = Math.max(...betAmounts);
      
      // Detect tilt patterns
      const tiltPatterns = this.detectCSVTiltPatterns(bets);
      session.tiltAlerts.push(...tiltPatterns.map(p => ({
        type: p.type,
        severity: p.severity,
        message: p.description,
        timestamp: Date.now(),
        confidence: p.confidence,
        actionTaken: 'csv_analysis'
      })));

      await this.publishEvent('csv_processed', { sessionId, parseResult, tiltPatterns });
    }

    return parseResult;
  }

  async processScreenshot(sessionId: string, imageData: string, casinoId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    console.log(`[AnalysisIntegration] Processing screenshot for session ${sessionId}`);
    
    // Convert base64 to Uint8Array
    const binaryData = Buffer.from(imageData, 'base64');
    const uint8Array = new Uint8Array(binaryData);
    
    const patterns = await visualRecognizer.analyzeScreenshot(uint8Array, casinoId);
    
    // Extract meaningful data from patterns
    const extractedData = visualRecognizer.extractNumbers(patterns);
    
    // Update session with visual data
    if (extractedData.betAmount) {
      await this.recordBet(sessionId, {
        amount: extractedData.betAmount,
        timestamp: Date.now(),
        source: 'visual_recognition'
      });
    }

    // Check for visual tilt patterns
    const visualTiltPatterns = this.detectVisualTiltPatterns(patterns);
    session.tiltAlerts.push(...visualTiltPatterns.map(p => ({
      type: p.type,
      severity: p.severity,
      message: p.description,
      timestamp: Date.now(),
      confidence: p.confidence,
      actionTaken: 'visual_analysis'
    })));

    await this.publishEvent('screenshot_processed', { sessionId, patterns, extractedData });
    
    return { patterns, extractedData, tiltAlerts: visualTiltPatterns };
  }

  async recordBet(sessionId: string, betData: any) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const { amount, result, timestamp = Date.now() } = betData;
    
    session.metrics.totalBets++;
    session.metrics.totalWagered += amount;
    
    if (result && result.winAmount) {
      session.metrics.totalWon += result.winAmount;
      session.metrics.currentStreak = result.winAmount > 0 ? 
        (session.metrics.currentStreak > 0 ? session.metrics.currentStreak + 1 : 1) :
        (session.metrics.currentStreak < 0 ? session.metrics.currentStreak - 1 : -1);
    }

    session.metrics.sessionDuration = Date.now() - session.startTime;
    session.metrics.averageBetSize = session.metrics.totalWagered / session.metrics.totalBets;
    session.metrics.largestBet = Math.max(session.metrics.largestBet, amount);

    // Check for rapid betting
    const recentBets = this.getRecentBets(sessionId, 60000); // Last minute
    if (recentBets.length > 10) {
      session.metrics.rapidBetCount++;
      session.tiltAlerts.push({
        type: 'rapid_betting',
        severity: 'medium',
        message: `${recentBets.length} bets in the last minute`,
        timestamp: Date.now(),
        confidence: 0.9
      });
    }

    // Calculate bankruptcy risk
    const netLoss = session.metrics.totalWagered - session.metrics.totalWon;
    const averageBetRatio = session.metrics.largestBet / session.metrics.averageBetSize;
    session.metrics.bankruptcyRisk = Math.min(100, 
      (netLoss / session.metrics.totalWagered * 100) + 
      (averageBetRatio > 3 ? 25 : 0) +
      (session.metrics.rapidBetCount * 10)
    );

    await this.publishEvent('bet_recorded', { sessionId, betData, metrics: session.metrics });
  }

  private getRecentBets(sessionId: string, timeWindow: number): any[] {
    // This would fetch recent bets from a more complete bet tracking system
    // For now, return a placeholder
    return [];
  }

  private detectCSVTiltPatterns(bets: any[]): any[] {
    const patterns = [];
    
    // Detect increasing bet sizes after losses
    for (let i = 1; i < bets.length; i++) {
      const currentBet = bets[i];
      const previousBet = bets[i - 1];
      
      if (previousBet.winAmount === 0 && currentBet.betAmount > previousBet.betAmount * 1.5) {
        patterns.push({
          type: 'loss_chasing',
          severity: 'high',
          description: `Bet increased by ${Math.round((currentBet.betAmount / previousBet.betAmount - 1) * 100)}% after loss`,
          confidence: 0.85
        });
      }
    }
    
    // Detect extended losing streaks
    let lossStreak = 0;
    for (const bet of bets) {
      if (bet.winAmount === 0) {
        lossStreak++;
      } else {
        if (lossStreak > 10) {
          patterns.push({
            type: 'extended_loss_streak',
            severity: 'medium',
            description: `${lossStreak} consecutive losses detected`,
            confidence: 0.95
          });
        }
        lossStreak = 0;
      }
    }
    
    return patterns;
  }

  private detectVisualTiltPatterns(patterns: any[]): any[] {
    const tiltPatterns = [];
    
    const rapidClickPattern = patterns.find(p => p.name === 'potential_rapid_clicking');
    if (rapidClickPattern && rapidClickPattern.confidence > 0.7) {
      tiltPatterns.push({
        type: 'rapid_clicking',
        severity: 'high',
        description: 'Rapid clicking detected on spin button',
        confidence: rapidClickPattern.confidence
      });
    }

    const gameStatePattern = patterns.find(p => p.name === 'game_state');
    if (gameStatePattern && gameStatePattern.value === 'spinning' && gameStatePattern.confidence > 0.8) {
      tiltPatterns.push({
        type: 'active_gambling',
        severity: 'low',
        description: 'Active gambling session detected',
        confidence: gameStatePattern.confidence
      });
    }

    return tiltPatterns;
  }

  pauseSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'paused';
      console.log(`[AnalysisIntegration] Paused session ${sessionId}`);
    }
  }

  async completeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.metrics.sessionDuration = Date.now() - session.startTime;
      
      // Generate final report
      const report = await this.generateSessionReport(session);
      
      await this.publishEvent('session_completed', { session, report });
      console.log(`[AnalysisIntegration] Completed session ${sessionId}`);
      
      return report;
    }
  }

  private async generateSessionReport(session: AnalysisSession): Promise<SessionReport> {
    const report: SessionReport = {
      sessionId: session.sessionId,
      userId: session.userId,
      casinoId: session.casinoId,
      duration: session.metrics.sessionDuration,
      totalBets: session.metrics.totalBets,
      totalWagered: session.metrics.totalWagered,
      totalWon: session.metrics.totalWon,
      netResult: session.metrics.totalWon - session.metrics.totalWagered,
      tiltScore: this.calculateTiltScore(session),
      riskLevel: this.calculateRiskLevel(session),
      recommendations: this.generateRecommendations(session),
      timestamp: Date.now()
    };

    return report;
  }

  private calculateTiltScore(session: AnalysisSession): number {
    const { metrics, tiltAlerts } = session;
    
    let score = 0;
    
    // Base score from alerts
    score += tiltAlerts.filter(a => a.severity === 'high').length * 25;
    score += tiltAlerts.filter(a => a.severity === 'medium').length * 15;
    score += tiltAlerts.filter(a => a.severity === 'low').length * 5;
    
    // Bankruptcy risk factor
    score += metrics.bankruptcyRisk * 0.5;
    
    // Rapid betting factor
    score += metrics.rapidBetCount * 10;
    
    // Session duration factor (over 2 hours is concerning)
    const hoursPlayed = metrics.sessionDuration / (1000 * 60 * 60);
    if (hoursPlayed > 2) {
      score += (hoursPlayed - 2) * 15;
    }
    
    return Math.min(100, score);
  }

  private calculateRiskLevel(session: AnalysisSession): 'low' | 'medium' | 'high' | 'critical' {
    const tiltScore = this.calculateTiltScore(session);
    
    if (tiltScore >= 80) return 'critical';
    if (tiltScore >= 60) return 'high';
    if (tiltScore >= 30) return 'medium';
    return 'low';
  }

  private generateRecommendations(session: AnalysisSession): string[] {
    const recommendations: string[] = [];
    const { metrics, tiltAlerts } = session;
    
    if (metrics.bankruptcyRisk > 70) {
      recommendations.push('Consider taking a break - bankruptcy risk is high');
    }
    
    if (metrics.rapidBetCount > 5) {
      recommendations.push('Slow down your betting pace to make more deliberate decisions');
    }
    
    const netLoss = metrics.totalWagered - metrics.totalWon;
    const lossPercentage = (netLoss / metrics.totalWagered) * 100;
    
    if (lossPercentage > 50) {
      recommendations.push('Consider setting a loss limit and sticking to it');
    }
    
    if (session.metrics.sessionDuration > 3 * 60 * 60 * 1000) { // 3 hours
      recommendations.push('Take a break - extended sessions increase tilt risk');
    }
    
    if (tiltAlerts.some(a => a.type === 'loss_chasing')) {
      recommendations.push('Avoid increasing bet sizes after losses');
    }
    
    return recommendations;
  }

  private async publishEvent(eventType: string, data: any) {
    // Publish to event router for other services to consume
    const event = {
      type: eventType,
      data,
      timestamp: Date.now(),
      source: 'analysis-integration'
    };

    // Send to all connected WebSocket clients
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ type: 'event', event }));
      }
    });

    console.log(`[AnalysisIntegration] Published event: ${eventType}`);
  }

  // API for Discord bot to get session status
  getSession(sessionId: string): AnalysisSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessionsForUser(userId: string): AnalysisSession[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  // Health check for the service
  getHealthStatus() {
    return {
      status: 'healthy',
      activeSessions: this.sessions.size,
      uptime: process.uptime(),
      websocketConnections: this.wss.clients.size,
      port: 7075
    };
  }
}

export interface SessionReport {
  sessionId: string;
  userId: string;
  casinoId: string;
  duration: number;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  netResult: number;
  tiltScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  timestamp: number;
}

// Export singleton instance
export const analysisIntegration = new AnalysisIntegrationService();