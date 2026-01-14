import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Device registration and management
  device: router({
    register: publicProcedure
      .input(z.object({
        deviceId: z.string().min(1),
        name: z.string().min(1),
        phone: z.string().min(10),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getDeviceByDeviceId(input.deviceId);
        if (existing) {
          return existing;
        }
        const device = await db.createDevice({
          deviceId: input.deviceId,
          name: input.name,
          phone: input.phone,
          email: input.email,
          isActive: true,
        });
        if (!device) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create device" });
        return device;
      }),

    getDevice: publicProcedure
      .input(z.object({ deviceId: z.string() }))
      .query(async ({ input }) => {
        const device = await db.getDeviceByDeviceId(input.deviceId);
        return device || null;
      }),

    updateDevice: publicProcedure
      .input(z.object({
        deviceId: z.string(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const { deviceId, ...updates } = input;
        const device = await db.updateDevice(deviceId, updates);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        return device;
      }),
  }),

  // Emergency contacts management
  contacts: router({
    list: publicProcedure
      .input(z.object({ deviceId: z.string() }))
      .query(async ({ input }) => {
        return db.getEmergencyContacts(input.deviceId);
      }),

    add: publicProcedure
      .input(z.object({
        deviceId: z.string(),
        name: z.string().min(1),
        phone: z.string().min(10),
        email: z.string().email().optional(),
        priority: z.number().int().min(0).default(0),
      }))
      .mutation(async ({ input }) => {
        const contact = await db.createEmergencyContact({
          deviceId: input.deviceId,
          name: input.name,
          phone: input.phone,
          email: input.email,
          priority: input.priority,
          isActive: true,
        });
        if (!contact) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create contact" });
        return contact;
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        priority: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const contact = await db.updateEmergencyContact(id, updates);
        if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
        return contact;
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteEmergencyContact(input.id);
        return { success };
      }),
  }),

  // SOS emergency system
  sos: router({
    trigger: publicProcedure
      .input(z.object({
        deviceId: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        triggerType: z.enum(["manual", "voice", "offline"]).default("manual"),
      }))
      .mutation(async ({ input }) => {
        // Check rate limiting
        const rateLimit = await db.getSosRateLimit(input.deviceId);
        const now = new Date();
        
        if (rateLimit && rateLimit.isBlocked && rateLimit.blockedUntil && rateLimit.blockedUntil > now) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "SOS requests are rate limited" });
        }

        // Create SOS event
        const eventId = nanoid();
        const sosEvent = await db.createSosEvent({
          eventId,
          deviceId: input.deviceId,
          status: "active",
          triggerType: input.triggerType,
          initialLat: input.latitude.toString() as any,
          initialLng: input.longitude.toString() as any,
          trackingStartedAt: now,
        });

        if (!sosEvent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create SOS event" });

        // Add initial location
        await db.addLocationHistory({
          eventId,
          deviceId: input.deviceId,
          latitude: input.latitude.toString() as any,
          longitude: input.longitude.toString() as any,
        });

        // Update device location
        await db.updateDevice(input.deviceId, {
          lastLocationLat: input.latitude.toString() as any,
          lastLocationLng: input.longitude.toString() as any,
          lastLocationTimestamp: now,
        });

        return sosEvent;
      }),

    getActive: publicProcedure
      .input(z.object({ deviceId: z.string() }))
      .query(async ({ input }) => {
        return db.getActiveSosEvents(input.deviceId);
      }),

    resolve: publicProcedure
      .input(z.object({ eventId: z.string() }))
      .mutation(async ({ input }) => {
        const sosEvent = await db.updateSosEvent(input.eventId, {
          status: "resolved",
          resolvedAt: new Date(),
        });
        if (!sosEvent) throw new TRPCError({ code: "NOT_FOUND", message: "SOS event not found" });
        return sosEvent;
      }),

    getLocationHistory: publicProcedure
      .input(z.object({ eventId: z.string() }))
      .query(async ({ input }) => {
        return db.getLocationHistory(input.eventId);
      }),
  }),

  // Offline SOS queue
  offline: router({
    queueSos: publicProcedure
      .input(z.object({
        deviceId: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      }))
      .mutation(async ({ input }) => {
        const queueId = nanoid();
        const queued = await db.addOfflineSosRequest({
          queueId,
          deviceId: input.deviceId,
          latitude: input.latitude.toString() as any,
          longitude: input.longitude.toString() as any,
          status: "pending",
        });
        if (!queued) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to queue SOS" });
        return queued;
      }),

    getPending: publicProcedure
      .input(z.object({ deviceId: z.string() }))
      .query(async ({ input }) => {
        return db.getPendingOfflineSosRequests(input.deviceId);
      }),

    markSynced: publicProcedure
      .input(z.object({ queueId: z.string(), eventId: z.string() }))
      .mutation(async ({ input }) => {
        const updated = await db.updateOfflineSosRequest(input.queueId, {
          status: "synced",
          eventId: input.eventId,
          syncedAt: new Date(),
        });
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Queue item not found" });
        return updated;
      }),
  }),
});

export type AppRouter = typeof appRouter;
