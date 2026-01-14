import { nanoid } from "nanoid";

const DEVICE_ID_KEY = "safeher_device_id";
const CONTACTS_CACHE_KEY = "safeher_contacts_cache";
const DEVICE_INFO_KEY = "safeher_device_info";

export interface CachedContact {
  id: number;
  name: string;
  phone: string;
  email?: string;
  priority: number;
}

export interface CachedDeviceInfo {
  deviceId: string;
  name: string;
  phone: string;
  email?: string;
}

/**
 * Get or create device ID stored in browser localStorage
 */
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${nanoid()}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get stored device ID
 */
export function getDeviceId(): string | null {
  return localStorage.getItem(DEVICE_ID_KEY);
}

/**
 * Clear device ID (for testing/reset)
 */
export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
}

/**
 * Check if device is registered
 */
export function isDeviceRegistered(): boolean {
  return !!localStorage.getItem(DEVICE_INFO_KEY);
}

/**
 * Save device info to local cache
 */
export function cacheDeviceInfo(info: CachedDeviceInfo): void {
  localStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(info));
}

/**
 * Get cached device info
 */
export function getCachedDeviceInfo(): CachedDeviceInfo | null {
  const cached = localStorage.getItem(DEVICE_INFO_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

/**
 * Clear device info cache
 */
export function clearDeviceInfo(): void {
  localStorage.removeItem(DEVICE_INFO_KEY);
}

/**
 * Cache emergency contacts locally
 */
export function cacheContacts(contacts: CachedContact[]): void {
  localStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(contacts));
}

/**
 * Get cached emergency contacts
 */
export function getCachedContacts(): CachedContact[] {
  const cached = localStorage.getItem(CONTACTS_CACHE_KEY);
  if (!cached) return [];
  try {
    return JSON.parse(cached);
  } catch {
    return [];
  }
}

/**
 * Add contact to cache
 */
export function addContactToCache(contact: CachedContact): void {
  const contacts = getCachedContacts();
  const exists = contacts.some(c => c.id === contact.id);
  if (!exists) {
    contacts.push(contact);
    cacheContacts(contacts);
  }
}

/**
 * Remove contact from cache
 */
export function removeContactFromCache(contactId: number): void {
  const contacts = getCachedContacts();
  const filtered = contacts.filter(c => c.id !== contactId);
  cacheContacts(filtered);
}

/**
 * Clear all contacts cache
 */
export function clearContactsCache(): void {
  localStorage.removeItem(CONTACTS_CACHE_KEY);
}

/**
 * Get current location with high accuracy
 */
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy?: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Watch location changes (for real-time tracking)
 */
export function watchLocation(
  callback: (location: { latitude: number; longitude: number; accuracy?: number }) => void,
  onError?: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    throw new Error("Geolocation not supported");
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    onError,
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }
  );
}

/**
 * Stop watching location
 */
export function stopWatchingLocation(watchId: number): void {
  navigator.geolocation.clearWatch(watchId);
}

/**
 * Generate shareable location link
 */
export function generateLocationLink(latitude: number, longitude: number): string {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Send local notification
 */
export function sendNotification(title: string, options?: NotificationOptions): void {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, options);
  }
}
