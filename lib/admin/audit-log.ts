import { db } from "@/db"
import { auditLogs } from "@/db/schema"
import { NextRequest } from "next/server"

export interface AuditLogEntry {
  userId?: number // For non-admin users
  adminId?: number // For admin users
  action: string
  entityType: string
  entityId?: number
  description: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  severity?: "info" | "warning" | "critical"
}

export async function logAdminAction({
  userId,
  adminId,
  action,
  entityType,
  entityId,
  description,
  metadata,
  ipAddress,
  userAgent,
  severity = "info",
}: AuditLogEntry) {
  try {
    await db.insert(auditLogs).values({
      userId: userId || adminId, // For backward compatibility
      adminId,
      action,
      entityType,
      entityId,
      details: description, // For backward compatibility
      description,
      metadata,
      severity,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error("Failed to log admin action:", error)
    // Don't throw error to avoid breaking the main operation
  }
}

// Generic function for logging any user action (not just admin)
export async function logUserAction({
  userId,
  adminId,
  action,
  entityType,
  entityId,
  description,
  metadata,
  ipAddress,
  userAgent,
  severity = "info",
}: AuditLogEntry) {
  try {
    await db.insert(auditLogs).values({
      userId,
      adminId,
      action,
      entityType,
      entityId,
      details: description,
      description,
      metadata,
      severity,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error("Failed to log user action:", error)
    // Don't throw error to avoid breaking the main operation
  }
}

// Backward compatible function for simple audit logging
export async function logSimpleAction({
  userId,
  action,
  details,
  ipAddress,
  userAgent,
}: {
  userId?: number | null
  action: string
  details: string
  ipAddress?: string
  userAgent?: string
}) {
  try {
    await db.insert(auditLogs).values({
      userId,
      adminId: userId,
      action,
      entityType: "system",
      details,
      description: details,
      severity: "info",
      ipAddress,
      userAgent,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error("Failed to log simple action:", error)
  }
}

export function extractRequestInfo(req: NextRequest) {
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown"

  const userAgent = req.headers.get("user-agent") || "unknown"

  return { ipAddress, userAgent }
}

// Common audit log actions
export const AUDIT_ACTIONS = {
  // Authentication & Authorization
  USER_LOGIN: "user_login",
  USER_LOGOUT: "user_logout",
  USER_REGISTER: "user_register",
  USER_LOGIN_FAILED: "user_login_failed",
  PASSWORD_RESET_REQUEST: "password_reset_request",
  PASSWORD_RESET_COMPLETE: "password_reset_complete",
  EMAIL_VERIFICATION: "email_verification",

  // User Management (Admin)
  APPROVE_MENTOR: "approve_mentor",
  REJECT_MENTOR: "reject_mentor",
  SUSPEND_USER: "suspend_user",
  UNSUSPEND_USER: "unsuspend_user",
  BLACKLIST_USER: "blacklist_user",
  UNBLACKLIST_USER: "unblacklist_user",
  DELETE_USER: "delete_user",
  UPDATE_USER: "update_user",

  // Profile Management
  UPDATE_PROFILE: "update_profile",
  UPDATE_AVATAR: "update_avatar",
  UPDATE_SKILLS: "update_skills",
  UPDATE_AVAILABILITY: "update_availability",
  UPDATE_SETTINGS: "update_settings",

  // Session Management
  SESSION_CREATE: "session_create",
  SESSION_START: "session_start",
  SESSION_JOIN: "session_join",
  SESSION_LEAVE: "session_leave",
  SESSION_END: "session_end",
  SESSION_CANCEL: "session_cancel",
  FORCE_END_SESSION: "force_end_session",
  REFUND_SESSION: "refund_session",
  VIEW_SESSION_DETAILS: "view_session_details",

  // Booking Management
  BOOKING_CREATE: "booking_create",
  BOOKING_ACCEPT: "booking_accept",
  BOOKING_REJECT: "booking_reject",
  BOOKING_CANCEL: "booking_cancel",

  // Payment & Credits
  CREDITS_PURCHASE: "credits_purchase",
  CREDITS_REFUND: "credits_refund",
  CREDITS_TRANSFER: "credits_transfer",
  WITHDRAWAL_REQUEST: "withdrawal_request",
  WITHDRAWAL_COMPLETE: "withdrawal_complete",
  PAYMENT_WEBHOOK: "payment_webhook",

  // Messaging
  MESSAGE_SEND: "message_send",
  MESSAGE_DELETE: "message_delete",
  CONVERSATION_CREATE: "conversation_create",
  CONVERSATION_ARCHIVE: "conversation_archive",

  // Reviews & Feedback
  REVIEW_CREATE: "review_create",
  REVIEW_UPDATE: "review_update",
  REVIEW_DELETE: "review_delete",
  FEEDBACK_SUBMIT: "feedback_submit",

  // Reports Management
  REPORT_CREATE: "report_create",
  REVIEW_REPORT: "review_report",
  RESOLVE_REPORT: "resolve_report",
  DISMISS_REPORT: "dismiss_report",

  // Support Tickets
  TICKET_CREATE: "ticket_create",
  TICKET_UPDATE: "ticket_update",
  TICKET_REPLY: "ticket_reply",
  TICKET_CLOSE: "ticket_close",

  // System Management (Admin)
  UPDATE_PLATFORM_SETTINGS: "update_platform_settings",
  CREATE_ANNOUNCEMENT: "create_announcement",
  UPDATE_ANNOUNCEMENT: "update_announcement",
  DELETE_ANNOUNCEMENT: "delete_announcement",

  // Skill Categories (Admin)
  CREATE_SKILL_CATEGORY: "create_skill_category",
  UPDATE_SKILL_CATEGORY: "update_skill_category",
  DELETE_SKILL_CATEGORY: "delete_skill_category",
  ASSIGN_SKILL_CATEGORY: "assign_skill_category",

  // Admin Actions
  ADMIN_LOGIN: "admin_login",
  ADMIN_LOGOUT: "admin_logout",
  VIEW_AUDIT_LOG: "view_audit_log",
  EXPORT_DATA: "export_data",
} as const

export const ENTITY_TYPES = {
  USER: "user",
  MENTOR: "mentor",
  LEARNER: "learner",
  SESSION: "session",
  BOOKING: "booking",
  MESSAGE: "message",
  CONVERSATION: "conversation",
  REVIEW: "review",
  FEEDBACK: "feedback",
  REPORT: "report",
  TICKET: "ticket",
  PAYMENT: "payment",
  CREDITS: "credits",
  WITHDRAWAL: "withdrawal",
  ANNOUNCEMENT: "announcement",
  SKILL_CATEGORY: "skill_category",
  PLATFORM_SETTINGS: "platform_settings",
  ADMIN: "admin",
  SYSTEM: "system",
} as const