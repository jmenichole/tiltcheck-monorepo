// Sample subscriber wiring for QualifyFirst events using the engine's publisher API.
// In a real setup, you would integrate with an event router / bus. This is a minimal example.
import { attachPublisher, getMetrics, resetMetrics } from './engine.js';

// Simple console forwarding subscriber (could be replaced by event-router or message bus)
attachPublisher({
  publish(type, payload) {
    if (process.env.QF_SUBSCRIBER_SILENT) return;
    console.log(`[qualifyfirst-subscriber] event=${type}`);
    // Example: periodically log metrics snapshot after every 10 matches
    const metrics = getMetrics();
    if (metrics.totalMatches % 10 === 0) {
      console.log('[qualifyfirst-metrics-snapshot]', metrics);
    }
  }
});

// Export helper for external systems to query/reset metrics
export function snapshotMetrics() {
  return getMetrics();
}
export function clearMetrics() {
  resetMetrics();
}
