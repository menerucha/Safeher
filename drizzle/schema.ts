import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Device table for device-based registration (no login required)
 * Each device gets a unique ID stored in browser localStorage
 */
export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: varchar("deviceId", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  isActive: boolean("isActive").default(true).notNull(),
  lastLocationLat: decimal("lastLocationLat", { precision: 10, scale: 8 }),
  lastLocationLng: decimal("lastLocationLng", { precision: 11, scale: 8 }),
  lastLocationTimestamp: timestamp("lastLocationTimestamp"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

/**
 * Emergency contacts for each device
 */
export const emergencyContacts = mysqlTable("emergencyContacts", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: varchar("deviceId", { length: 64 }).notNull(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  priority: int("priority").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = typeof emergencyContacts.$inferInsert;

/**
 * SOS events - triggered when user activates emergency
 */
export const sosEvents = mysqlTable("sosEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 64 }).notNull().unique(),
  deviceId: varchar("deviceId", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["active", "resolved", "cancelled", "expired"]).default("active").notNull(),
  triggerType: mysqlEnum("triggerType", ["manual", "voice", "offline"]).default("manual").notNull(),
  initialLat: decimal("initialLat", { precision: 10, scale: 8 }).notNull(),
  initialLng: decimal("initialLng", { precision: 11, scale: 8 }).notNull(),
  notificationsSent: int("notificationsSent").default(0).notNull(),
  trackingStartedAt: timestamp("trackingStartedAt"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SosEvent = typeof sosEvents.$inferSelect;
export type InsertSosEvent = typeof sosEvents.$inferInsert;

/**
 * Location history for tracking during active SOS
 */
export const locationHistory = mysqlTable("locationHistory", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 64 }).notNull(),
  deviceId: varchar("deviceId", { length: 64 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: int("accuracy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LocationHistory = typeof locationHistory.$inferSelect;
export type InsertLocationHistory = typeof locationHistory.$inferInsert;

/**
 * Notifications sent to emergency contacts
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  notificationId: varchar("notificationId", { length: 64 }).notNull().unique(),
  eventId: varchar("eventId", { length: 64 }).notNull(),
  contactId: int("contactId").notNull(),
  type: mysqlEnum("type", ["sms", "email"]).notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "delivered"]).default("pending").notNull(),
  externalId: varchar("externalId", { length: 255 }),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Offline SOS requests - cached when device is offline
 */
export const offlineSosQueue = mysqlTable("offlineSosQueue", {
  id: int("id").autoincrement().primaryKey(),
  queueId: varchar("queueId", { length: 64 }).notNull().unique(),
  deviceId: varchar("deviceId", { length: 64 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  status: mysqlEnum("status", ["pending", "synced", "failed"]).default("pending").notNull(),
  retryCount: int("retryCount").default(0).notNull(),
  eventId: varchar("eventId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  syncedAt: timestamp("syncedAt"),
});

export type OfflineSosQueue = typeof offlineSosQueue.$inferSelect;
export type InsertOfflineSosQueue = typeof offlineSosQueue.$inferInsert;

/**
 * Rate limiting for SOS abuse prevention
 */
export const sosRateLimit = mysqlTable("sosRateLimit", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: varchar("deviceId", { length: 64 }).notNull().unique(),
  sosCount: int("sosCount").default(0).notNull(),
  windowStart: timestamp("windowStart").notNull(),
  isBlocked: boolean("isBlocked").default(false).notNull(),
  blockedUntil: timestamp("blockedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SosRateLimit = typeof sosRateLimit.$inferSelect;
export type InsertSosRateLimit = typeof sosRateLimit.$inferInsert;