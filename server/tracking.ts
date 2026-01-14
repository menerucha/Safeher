import * as db from "./db";
import type { SosEvent } from "../drizzle/schema";

/**
 * Real-time location tracking service
 * Manages WebSocket connections and location updates for active SOS events
 */

interface TrackedLocation {
  eventId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

interface TrackingSession {
  eventId: string;
  deviceId: string;
  subscribers: Set<string>; // Contact IDs or admin IDs subscribed to this event
  startedAt: Date;
}

// In-memory tracking sessions (in production, use Redis)
const activeSessions = new Map<string, TrackingSession>();

/**
 * Start tracking an SOS event
 */
export function startTracking(eventId: string, deviceId: string): TrackingSession {
  const session: TrackingSession = {
    eventId,
    deviceId,
    subscribers: new Set(),
    startedAt: new Date(),
  };
  activeSessions.set(eventId, session);
  return session;
}

/**
 * Stop tracking an SOS event
 */
export function stopTracking(eventId: string): boolean {
  return activeSessions.delete(eventId);
}

/**
 * Get active tracking session
 */
export function getTrackingSession(eventId: string): TrackingSession | undefined {
  return activeSessions.get(eventId);
}

/**
 * Add subscriber to tracking session
 */
export function addSubscriber(eventId: string, subscriberId: string): boolean {
  const session = activeSessions.get(eventId);
  if (!session) return false;
  session.subscribers.add(subscriberId);
  return true;
}

/**
 * Remove subscriber from tracking session
 */
export function removeSubscriber(eventId: string, subscriberId: string): boolean {
  const session = activeSessions.get(eventId);
  if (!session) return false;
  session.subscribers.delete(subscriberId);
  return true;
}

/**
 * Get subscribers for an event
 */
export function getSubscribers(eventId: string): string[] {
  const session = activeSessions.get(eventId);
  return session ? Array.from(session.subscribers) : [];
}

/**
 * Update location for active SOS event
 */
export async function updateLocation(
  eventId: string,
  deviceId: string,
  latitude: number,
  longitude: number,
  accuracy?: number
): Promise<TrackedLocation | null> {
  try {
    // Check if event is still active
    const sosEvent = await db.getSosEventByEventId(eventId);
    if (!sosEvent || sosEvent.status !== "active") {
      return null;
    }

    // Add to location history
    const location = await db.addLocationHistory({
      eventId,
      deviceId,
      latitude: latitude.toString() as any,
      longitude: longitude.toString() as any,
      accuracy,
    });

    if (!location) return null;

    // Update device's last known location
    await db.updateDevice(deviceId, {
      lastLocationLat: latitude.toString() as any,
      lastLocationLng: longitude.toString() as any,
      lastLocationTimestamp: new Date(),
    });

    return {
      eventId,
      latitude,
      longitude,
      accuracy,
      timestamp: location.createdAt,
    };
  } catch (error) {
    console.error("[Tracking] Failed to update location:", error);
    return null;
  }
}

/**
 * Get location history for an event
 */
export async function getLocationTrail(eventId: string): Promise<TrackedLocation[]> {
  const history = await db.getLocationHistory(eventId);
  return history.map(loc => ({
    eventId,
    latitude: parseFloat(loc.latitude.toString()),
    longitude: parseFloat(loc.longitude.toString()),
    accuracy: loc.accuracy || undefined,
    timestamp: loc.createdAt,
  }));
}

/**
 * Get all active tracking sessions
 */
export function getAllActiveSessions(): TrackingSession[] {
  return Array.from(activeSessions.values());
}

/**
 * Get active sessions for a device
 */
export function getDeviceActiveSessions(deviceId: string): TrackingSession[] {
  return Array.from(activeSessions.values()).filter(s => s.deviceId === deviceId);
}

/**
 * Cleanup expired sessions (older than 24 hours)
 */
export function cleanupExpiredSessions(): number {
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  let cleaned = 0;

  const entries = Array.from(activeSessions.entries());
  for (const [eventId, session] of entries) {
    if (now.getTime() - session.startedAt.getTime() > maxAge) {
      activeSessions.delete(eventId);
      cleaned++;
    }
  }

  return cleaned;
}
