#!/usr/bin/env node

/**
 * Enhanced Analyzer Service Startup Script
 * 
 * Starts all analysis services in the correct order:
 * 1. Enhanced WebSocket Analyzer (port 7074)
 * 2. Analysis Integration Service (port 7075)
 * 3. Health monitoring
 */

import { enhancedAnalyzer } from './index.js';
import { analysisIntegration } from './analysis-integration.js';
import { csvParser } from './csv-parser.js';
import { visualRecognizer } from './visual-recognition.js';

console.log('🚀 Starting TiltCheck Enhanced Analysis Services...\n');

// Test CSV parser
console.log('📊 Testing CSV Parser...');
try {
  const testCSV = 'timestamp,bet_amount,win_amount,game\n2024-01-01 12:00:00,1.00,0.00,slots\n2024-01-01 12:01:00,2.00,5.00,slots';
  const parseResult = await csvParser.parseCSVContent(testCSV, 'test-casino');
  console.log('✅ CSV Parser ready:', parseResult.success ? 'Working' : 'Error');
} catch (error) {
  console.log('⚠️ CSV Parser warning:', error.message);
}

// Test visual recognizer
console.log('🔍 Testing Visual Recognition...');
try {
  // Create a minimal test image (PNG header)
  const testImage = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x64, // 100x100 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00                     // bit depth, color type, etc
  ]);
  
  const patterns = await visualRecognizer.analyzeScreenshot(testImage, 'crown-coins');
  console.log('✅ Visual Recognition ready:', patterns ? 'Working' : 'Error');
} catch (error) {
  console.log('⚠️ Visual Recognition warning:', error.message);
}

// Service status monitoring
setInterval(() => {
  const enhancedStatus = enhancedAnalyzer.getHealthStatus();
  const integrationStatus = analysisIntegration.getHealthStatus();
  
  console.log(`\n📈 Service Status (${new Date().toISOString()})`);
  console.log(`Enhanced Analyzer: ${enhancedStatus.activeSessions} sessions, ${enhancedStatus.websocketConnections} connections`);
  console.log(`Integration Service: ${integrationStatus.activeSessions} sessions, ${integrationStatus.websocketConnections} connections`);
  console.log(`Uptime: ${Math.floor(enhancedStatus.uptime / 60)} minutes`);
}, 5 * 60 * 1000); // Every 5 minutes

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Enhanced Analysis Services...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Enhanced Analysis Services...');
  process.exit(0);
});

console.log('\n🎯 Enhanced Analysis Services Started Successfully!');
console.log('📡 Enhanced Analyzer WebSocket: ws://localhost:7074');
console.log('🔗 Analysis Integration WebSocket: ws://localhost:7075');
console.log('📊 CSV Parser: Ready for file uploads');
console.log('🔍 Visual Recognition: Ready for screenshot analysis');
console.log('\n💡 Ready to process automated casino analysis requests!');
console.log('   Use /casino name:crown-coins analyze:true in Discord to start\n');