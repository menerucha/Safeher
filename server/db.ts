import { eq, and, desc, asc, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, devices, emergencyContacts, sosEvents, locationHistory, notifications, offlineSosQueue, sosRateLimit } from "../drizzle/schema";
import { ENV } from './_core/env';
import type { Device, InsertDevice, EmergencyContact, InsertEmergencyContact, SosEvent, InsertSosEvent, LocationHistory, InsertLocationHistory, Notification, InsertNotification, OfflineSosQueue, InsertOfflineSosQueue, SosRateLimit, InsertSosRateLimit } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Device queries
export async function getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(devices).where(eq(devices.deviceId, deviceId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDevice(device: InsertDevice): Promise<Device | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(devices).values(device);
  return getDeviceByDeviceId(device.deviceId);
}

export async function updateDevice(deviceId: string, updates: Partial<Device>): Promise<Device | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(devices).set(updates).where(eq(devices.deviceId, deviceId));
  return getDeviceByDeviceId(deviceId);
}

// Emergency contacts queries
export async function getEmergencyContacts(deviceId: string): Promise<EmergencyContact[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emergencyContacts).where(eq(emergencyContacts.deviceId, deviceId)).orderBy(asc(emergencyContacts.priority));
}

export async function createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(emergencyContacts).values(contact);
  if (!result) return undefined;
  const contacts = await getEmergencyContacts(contact.deviceId);
  return contacts.find(c => c.name === contact.name && c.phone === contact.phone);
}

export async function updateEmergencyContact(id: number, updates: Partial<EmergencyContact>): Promise<EmergencyContact | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(emergencyContacts).set(updates).where(eq(emergencyContacts.id, id));
  const result = await db.select().from(emergencyContacts).where(eq(emergencyContacts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteEmergencyContact(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
  return true;
}

// SOS events queries
export async function createSosEvent(event: InsertSosEvent): Promise<SosEvent | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(sosEvents).values(event);
  if (!result) return undefined;
  return getSosEventByEventId(event.eventId);
}

export async function getSosEventByEventId(eventId: string): Promise<SosEvent | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sosEvents).where(eq(sosEvents.eventId, eventId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActiveSosEvents(deviceId: string): Promise<SosEvent[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sosEvents).where(and(eq(sosEvents.deviceId, deviceId), eq(sosEvents.status, "active"))).orderBy(desc(sosEvents.createdAt));
}

export async function updateSosEvent(eventId: string, updates: Partial<SosEvent>): Promise<SosEvent | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(sosEvents).set(updates).where(eq(sosEvents.eventId, eventId));
  return getSosEventByEventId(eventId);
}

// Location history queries
export async function addLocationHistory(location: InsertLocationHistory): Promise<LocationHistory | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(locationHistory).values(location);
  return location as LocationHistory;
}

export async function getLocationHistory(eventId: string): Promise<LocationHistory[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(locationHistory).where(eq(locationHistory.eventId, eventId)).orderBy(desc(locationHistory.createdAt));
}

// Notification queries
export async function createNotification(notification: InsertNotification): Promise<Notification | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(notifications).values(notification);
  if (!result) return undefined;
  const notif = await db.select().from(notifications).where(eq(notifications.notificationId, notification.notificationId)).limit(1);
  return notif.length > 0 ? notif[0] : undefined;
}

export async function updateNotification(notificationId: string, updates: Partial<Notification>): Promise<Notification | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(notifications).set(updates).where(eq(notifications.notificationId, notificationId));
  const result = await db.select().from(notifications).where(eq(notifications.notificationId, notificationId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEventNotifications(eventId: string): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.eventId, eventId)).orderBy(desc(notifications.createdAt));
}

// Offline SOS queue queries
export async function addOfflineSosRequest(request: InsertOfflineSosQueue): Promise<OfflineSosQueue | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(offlineSosQueue).values(request);
  if (!result) return undefined;
  const queued = await db.select().from(offlineSosQueue).where(eq(offlineSosQueue.queueId, request.queueId)).limit(1);
  return queued.length > 0 ? queued[0] : undefined;
}

export async function getPendingOfflineSosRequests(deviceId: string): Promise<OfflineSosQueue[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(offlineSosQueue).where(and(eq(offlineSosQueue.deviceId, deviceId), eq(offlineSosQueue.status, "pending"))).orderBy(asc(offlineSosQueue.createdAt));
}

export async function updateOfflineSosRequest(queueId: string, updates: Partial<OfflineSosQueue>): Promise<OfflineSosQueue | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(offlineSosQueue).set(updates).where(eq(offlineSosQueue.queueId, queueId));
  const result = await db.select().from(offlineSosQueue).where(eq(offlineSosQueue.queueId, queueId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Rate limiting queries
export async function getSosRateLimit(deviceId: string): Promise<SosRateLimit | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sosRateLimit).where(eq(sosRateLimit.deviceId, deviceId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrUpdateSosRateLimit(deviceId: string, updates: Partial<SosRateLimit>): Promise<SosRateLimit | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getSosRateLimit(deviceId);
  if (existing) {
    await db.update(sosRateLimit).set(updates).where(eq(sosRateLimit.deviceId, deviceId));
  } else {
    await db.insert(sosRateLimit).values({ deviceId, ...updates } as InsertSosRateLimit);
  }
  return getSosRateLimit(deviceId);
}
