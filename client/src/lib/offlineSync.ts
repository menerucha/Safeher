import { nanoid } from "nanoid";

const OFFLINE_QUEUE_KEY = "safeher_offline_queue";

export interface OfflineSosRequest {
  queueId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  synced: boolean;
  eventId?: string;
}

/**
 * Add SOS request to offline queue
 */
export function queueOfflineSos(latitude: number, longitude: number): OfflineSosRequest {
  const request: OfflineSosRequest = {
    queueId: nanoid(),
    latitude,
    longitude,
    timestamp: Date.now(),
    synced: false,
  };

  const queue = getOfflineQueue();
  queue.push(request);
  saveOfflineQueue(queue);

  return request;
}

/**
 * Get offline queue
 */
export function getOfflineQueue(): OfflineSosRequest[] {
  const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save offline queue
 */
function saveOfflineQueue(queue: OfflineSosRequest[]): void {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Mark request as synced
 */
export function markAsSynced(queueId: string, eventId: string): void {
  const queue = getOfflineQueue();
  const request = queue.find(r => r.queueId === queueId);
  if (request) {
    request.synced = true;
    request.eventId = eventId;
    saveOfflineQueue(queue);
  }
}

/**
 * Get pending (unsynced) requests
 */
export function getPendingRequests(): OfflineSosRequest[] {
  return getOfflineQueue().filter(r => !r.synced);
}

/**
 * Clear offline queue
 */
export function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function onOnline(callback: () => void): () => void {
  window.addEventListener("online", callback);
  return () => window.removeEventListener("online", callback);
}

export function onOffline(callback: () => void): () => void {
  window.addEventListener("offline", callback);
  return () => window.removeEventListener("offline", callback);
}

/**
 * Sync pending requests when online
 */
export async function syncPendingRequests(
  syncFn: (request: OfflineSosRequest) => Promise<{ eventId: string }>
): Promise<{ synced: number; failed: number }> {
  const pending = getPendingRequests();
  let synced = 0;
  let failed = 0;

  for (const request of pending) {
    try {
      const result = await syncFn(request);
      markAsSynced(request.queueId, result.eventId);
      synced++;
    } catch (error) {
      console.error(`[OfflineSync] Failed to sync request ${request.queueId}:`, error);
      failed++;
    }
  }

  return { synced, failed };
}
