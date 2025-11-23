/**
 * TiltCheck Event Router
 *
 * Central event bus for the TiltCheck ecosystem.
 * Modules communicate through events, not direct calls.
 *
 * Philosophy:
 * - Loose coupling between modules
 * - Async by default
 * - Failed handlers don't crash the system
 * - Event history for debugging
 * - Easy to test and monitor
 */
import type { TiltCheckEvent, EventType, EventHandler, EventSubscription, ModuleId } from '@tiltcheck/types';
export declare class EventRouter {
    private emitter;
    private subscriptions;
    private eventHistory;
    private maxHistorySize;
    constructor(maxHistorySize?: number);
    /**
     * Subscribe to an event type
     */
    subscribe(eventType: EventType, handler: EventHandler, moduleId: ModuleId): () => void;
    /**
     * Unsubscribe from an event type
     */
    private unsubscribe;
    /**
     * Publish an event to all subscribers
     */
    publish<T = any>(type: EventType, source: ModuleId, data: T, userId?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Get event history (useful for debugging)
     */
    getHistory(filter?: {
        eventType?: EventType;
        source?: ModuleId;
        userId?: string;
        limit?: number;
    }): TiltCheckEvent[];
    /**
     * Get active subscriptions (for monitoring)
     */
    getSubscriptions(): Map<EventType, EventSubscription[]>;
    /**
     * Clear event history
     */
    clearHistory(): void;
    /**
     * Add event to history with size limit
     */
    private addToHistory;
    /**
     * Get stats about the event router
     */
    getStats(): {
        totalSubscriptions: number;
        eventTypes: number;
        historySize: number;
        maxHistorySize: number;
    };
}
export declare const eventRouter: EventRouter;
//# sourceMappingURL=event-router.d.ts.map