import { nanoid } from "nanoid";
import * as db from "./db";
import type { EmergencyContact, SosEvent } from "../drizzle/schema";

/**
 * Notification service for sending alerts to emergency contacts
 * Supports SMS via Twilio and email fallback
 */

interface NotificationResult {
  success: boolean;
  notificationId: string;
  type: "sms" | "email";
  recipient: string;
  error?: string;
}

/**
 * Send SMS notification via Twilio
 * Falls back to email if SMS fails
 */
export async function sendEmergencyAlert(
  sosEvent: SosEvent,
  contact: EmergencyContact,
  deviceName: string,
  locationUrl: string
): Promise<NotificationResult> {
  const notificationId = nanoid();
  
  try {
    // Try SMS first
    if (contact.phone) {
      return await sendSmsAlert(
        sosEvent.eventId,
        notificationId,
        contact,
        deviceName,
        locationUrl
      );
    }
  } catch (error) {
    console.error(`[Notification] SMS failed for ${contact.phone}:`, error);
  }

  // Fallback to email
  if (contact.email) {
    return await sendEmailAlert(
      sosEvent.eventId,
      notificationId,
      contact,
      deviceName,
      locationUrl
    );
  }

  return {
    success: false,
    notificationId,
    type: "sms",
    recipient: contact.phone || contact.email || "unknown",
    error: "No valid contact method available",
  };
}

/**
 * Send SMS via Twilio using Manus Data API
 */
async function sendSmsAlert(
  eventId: string,
  notificationId: string,
  contact: EmergencyContact,
  deviceName: string,
  locationUrl: string
): Promise<NotificationResult> {
  try {
    const message = `EMERGENCY ALERT from ${deviceName}: I need help! View my location: ${locationUrl}`;
    
    // Create notification record
    const notification = await db.createNotification({
      notificationId,
      eventId,
      contactId: contact.id,
      type: "sms",
      recipient: contact.phone,
      status: "pending",
    });

    if (!notification) {
      throw new Error("Failed to create notification record");
    }

    // Call Twilio via Manus Data API
    // Note: This would typically be done via a proper Twilio SDK or API call
    // For now, we'll create a placeholder that can be integrated with actual Twilio
    const response = await sendTwilioSms(contact.phone, message);

    // Update notification status
    await db.updateNotification(notificationId, {
      status: response.success ? "sent" : "failed",
      externalId: response.messageId,
      errorMessage: response.error,
      sentAt: new Date(),
    });

    return {
      success: response.success,
      notificationId,
      type: "sms",
      recipient: contact.phone,
      error: response.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await db.updateNotification(notificationId, {
      status: "failed",
      errorMessage,
    });
    throw error;
  }
}

/**
 * Send email alert as fallback
 */
async function sendEmailAlert(
  eventId: string,
  notificationId: string,
  contact: EmergencyContact,
  deviceName: string,
  locationUrl: string
): Promise<NotificationResult> {
  try {
    const subject = `EMERGENCY ALERT: ${deviceName} needs help`;
    const body = `
EMERGENCY ALERT

${deviceName} has triggered an emergency alert and needs help.

Location: ${locationUrl}

Please respond immediately if you are able to help.
    `.trim();

    // Create notification record
    const notification = await db.createNotification({
      notificationId,
      eventId,
      contactId: contact.id,
      type: "email",
      recipient: contact.email || "",
      status: "pending",
    });

    if (!notification) {
      throw new Error("Failed to create notification record");
    }

    // Call email service via Manus Data API
    const response = await sendEmailViaApi(contact.email || "", subject, body);

    // Update notification status
    await db.updateNotification(notificationId, {
      status: response.success ? "sent" : "failed",
      externalId: response.messageId,
      errorMessage: response.error,
      sentAt: new Date(),
    });

    return {
      success: response.success,
      notificationId,
      type: "email",
      recipient: contact.email || "",
      error: response.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await db.updateNotification(notificationId, {
      status: "failed",
      errorMessage,
    });
    throw error;
  }
}

/**
 * Send SMS via Twilio (placeholder for actual implementation)
 * This should be replaced with actual Twilio SDK integration
 */
async function sendTwilioSms(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Placeholder: In production, this would call actual Twilio API
    // For now, we simulate a successful send
    console.log(`[Twilio] Sending SMS to ${phoneNumber}: ${message}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      messageId: nanoid(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "SMS send failed";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send email via API (placeholder for actual implementation)
 */
async function sendEmailViaApi(
  email: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Placeholder: In production, this would call actual email service
    console.log(`[Email] Sending email to ${email}: ${subject}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      messageId: nanoid(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Email send failed";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send notifications to all emergency contacts for an SOS event
 */
export async function notifyAllContacts(
  sosEvent: SosEvent,
  deviceName: string,
  locationUrl: string
): Promise<NotificationResult[]> {
  const contacts = await db.getEmergencyContacts(sosEvent.deviceId);
  const results: NotificationResult[] = [];

  for (const contact of contacts) {
    if (!contact.isActive) continue;
    
    try {
      const result = await sendEmergencyAlert(sosEvent, contact, deviceName, locationUrl);
      results.push(result);
    } catch (error) {
      console.error(`[Notification] Failed to notify contact ${contact.id}:`, error);
      results.push({
        success: false,
        notificationId: nanoid(),
        type: "sms",
        recipient: contact.phone || contact.email || "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Update SOS event with notification count
  const successCount = results.filter(r => r.success).length;
  await db.updateSosEvent(sosEvent.eventId, {
    notificationsSent: successCount,
  });

  return results;
}
