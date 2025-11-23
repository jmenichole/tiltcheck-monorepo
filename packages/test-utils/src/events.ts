import { eventRouter } from '@tiltcheck/event-router';
import { v4 as uuidv4 } from 'uuid';

export function resetEvents(): void {
  eventRouter.clearHistory();
}

export function getEvents(type?: string): any[] {
  if (type) return eventRouter.getHistory({ eventType: type as any });
  return eventRouter.getHistory();
}

export function fakeEvent(type: string, source: string, data: any = {}): any {
  const evt = { eventId: uuidv4(), ...data };
  eventRouter.publish(type as any, source as any, evt);
  return evt;
}
