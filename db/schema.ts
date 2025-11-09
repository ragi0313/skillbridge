import { pgTable, serial, varchar, text, timestamp, integer, json, numeric, boolean, time, date, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  xenditAccountId: varchar("xendit_account_id", { length: 255 }),
  xenditAccountStatus: varchar("xendit_account_status", { length: 50 }).default("none"),
  preferredPaymentProvider: varchar("preferred_payment_provider", { length: 20 }).default("xendit"),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  suspensionEndsAt: timestamp("suspension_ends_at", { withTimezone: true }),
  suspensionReason: text("suspension_reason"),
  blacklistedAt: timestamp("blacklisted_at", { withTimezone: true }),
  blacklistReason: text("blacklist_reason"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
})

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  profilePictureUrl: varchar("profile_picture_url", { length: 512 }),
  createdAt: timestamp("created_at").defaultNow(),
})

export const learners = pgTable("learners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  country: varchar("country", { length: 100 }).notNull(),
  experienceLevel: varchar("experience_level", { length: 50 }).notNull(),
  learningGoals: text("learning_goals").notNull(),
  creditsBalance: integer("credits_balance").default(0).notNull(),
  profileUrl: varchar("profile_url", { length: 255 }),
  profilePictureUrl: varchar("profile_picture_url", { length: 255 }),
  timezone: varchar("timezone", { length: 100 }).notNull(),
  ...timestamps,
})

export const mentors = pgTable("mentors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  profileUrl: varchar("profile_url", { length: 255 }),
  profilePictureUrl: varchar("profile_picture_url", { length: 255 }).notNull(),
  languagesSpoken: json("languages_spoken").notNull(),
  gender: varchar("gender", { length: 50 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull(),
  professionalTitle: varchar("professional_title", { length: 100 }).notNull(),
  bio: text("bio"),
  yearsOfExperience: integer("years_of_experience").notNull(),
  linkedInUrl: varchar("linkedin_url", { length: 255 }).notNull(),
  socialLinks: json("social_links").notNull(),
  creditsBalance: integer("credits_balance").default(0).notNull(),
  ...timestamps,
})

export const mentorAvailability = pgTable("mentor_availability", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  day: varchar("day", { length: 20 }).notNull(), // e.g. "monday"
  startTime: time("start_time").notNull(), // e.g. "09:00 AM"
  endTime: time("end_time").notNull(), // e.g. "11:00 PM"
  isActive: boolean("is_active").default(true),
  ...timestamps,
})

export const mentorSkills = pgTable("mentor_skills", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  skillName: varchar("skill_name", { length: 100 }).notNull(),
  ratePerHour: integer("rate_per_hour").notNull(), // Rate in credits per hour
  isActive: boolean("is_active").default(true),
  ...timestamps,
})

export const skillCategories = pgTable("skill_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  ...timestamps,
})

export const mentorSkillCategories = pgTable("mentor_skill_categories", {
  id: serial("id").primaryKey(),
  mentorSkillId: integer("mentor_skill_id").notNull().references(() => mentorSkills.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => skillCategories.id, { onDelete: "cascade" }),
  createdBy: integer("created_by").notNull().references(() => users.id),
  ...timestamps,
})

export const mentorBlockedDates = pgTable("mentor_blocked_dates", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  blockedDate: date("blocked_date", { mode: "date" }).notNull(), // Store as date only
  reason: text("reason"),
  ...timestamps,
})
export const creditPurchases = pgTable("credit_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountCredits: integer("amount_credits").notNull(),
  amountPaidUsd: numeric("amount_paid_usd", { precision: 10, scale: 2 }).notNull(),
  localAmount: numeric("local_amount", { precision: 10, scale: 2 }),
  localCurrency: varchar("local_currency", { length: 10 }),
  provider: varchar("provider", { length: 50 }).notNull(), // 'xendit', 'stripe'
  xenditInvoiceId: varchar("xendit_invoice_id", { length: 255 }),
  xenditPaymentId: varchar("xendit_payment_id", { length: 255 }),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending"), // 'pending', 'completed', 'failed', 'cancelled'
  paymentReference: varchar("payment_reference", { length: 255 }),
  externalId: varchar("external_id", { length: 255 }),
  invoiceUrl: varchar("invoice_url", { length: 512 }),
  webhookData: json("webhook_data"), // Store webhook payload for debugging
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// Admin Audit Log for tracking all administrative actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // Can be null for unauthenticated users (for backward compatibility)
  adminId: integer("admin_id").references(() => users.id), // Admin who performed the action
  action: varchar("action", { length: 100 }).notNull(), // 'approve_mentor', 'suspend_user', 'delete_session', etc.
  entityType: varchar("entity_type", { length: 50 }), // 'user', 'mentor', 'session', etc.
  entityId: integer("entity_id"), // ID of the affected entity
  details: text("details").notNull(), // Human-readable description (for backward compatibility)
  description: text("description"), // More detailed description
  metadata: json("metadata"), // Additional structured data
  severity: varchar("severity", { length: 20 }).default("info"), // 'info', 'warning', 'critical'
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  adminIdIdx: index("audit_logs_admin_id_idx").on(table.adminId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  entityTypeIdx: index("audit_logs_entity_type_idx").on(table.entityType),
  severityIdx: index("audit_logs_severity_idx").on(table.severity),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
}))

// Support tickets for contact form submissions
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // Can be null for unauthenticated users
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'general', 'technical', 'billing', etc.
  subject: varchar("subject", { length: 200 }).notNull(),
  message: text("message").notNull(),
  priority: varchar("priority", { length: 20 }).default("medium"), // 'low', 'medium', 'high', 'urgent'
  status: varchar("status", { length: 20 }).default("open"), // 'open', 'in_progress', 'resolved', 'closed'
  assignedTo: integer("assigned_to").references(() => users.id), // Admin who handles the ticket
  adminNotes: text("admin_notes"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  lastResponseAt: timestamp("last_response_at", { withTimezone: true }),
  responseCount: integer("response_count").default(0),
  ...timestamps,
}, (table) => ({
  statusIdx: index("support_tickets_status_idx").on(table.status),
  categoryIdx: index("support_tickets_category_idx").on(table.category),
  priorityIdx: index("support_tickets_priority_idx").on(table.priority),
  assignedToIdx: index("support_tickets_assigned_to_idx").on(table.assignedTo),
  createdAtIdx: index("support_tickets_created_at_idx").on(table.createdAt),
}))

// Support ticket responses for email conversation management
export const supportTicketResponses = pgTable("support_ticket_responses", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  responderId: integer("responder_id").references(() => users.id), // Can be null for external responses
  responderType: varchar("responder_type", { length: 20 }).notNull(), // 'user', 'admin', 'system'
  responderName: varchar("responder_name", { length: 100 }).notNull(),
  responderEmail: varchar("responder_email", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").default(false), // Internal admin notes vs public responses
  emailMessageId: varchar("email_message_id", { length: 255 }), // For email threading
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  ticketIdIdx: index("support_ticket_responses_ticket_id_idx").on(table.ticketId),
  responderTypeIdx: index("support_ticket_responses_responder_type_idx").on(table.responderType),
  createdAtIdx: index("support_ticket_responses_created_at_idx").on(table.createdAt),
}))

// Reports submitted by users for harassment, inappropriate behavior, etc.
export const userReports = pgTable("user_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  reportedUserId: integer("reported_user_id").notNull().references(() => users.id),
  sessionId: integer("session_id").references(() => bookingSessions.id),
  category: varchar("category", { length: 50 }).notNull(), // 'harassment', 'inappropriate_content', 'fraud', etc.
  description: text("description").notNull(),
  evidence: json("evidence"), // Screenshots, chat logs, etc.
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'under_review', 'resolved', 'dismissed'
  adminNotes: text("admin_notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  resolution: text("resolution"),
  ...timestamps,
}, (table) => ({
  reporterIdx: index("user_reports_reporter_idx").on(table.reporterId),
  reportedUserIdx: index("user_reports_reported_user_idx").on(table.reportedUserId),
  statusIdx: index("user_reports_status_idx").on(table.status),
}))

// Platform announcements for users
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 30 }).default("general"), // 'general', 'maintenance', 'feature', 'warning'
  priority: varchar("priority", { length: 20 }).default("normal"), // 'low', 'normal', 'high', 'urgent'
  targetAudience: varchar("target_audience", { length: 50 }).default("all"), // 'all', 'mentors', 'learners', 'admins'
  isActive: boolean("is_active").default(true),
  publishAt: timestamp("publish_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdBy: integer("created_by").notNull().references(() => users.id),
  ...timestamps,
}, (table) => ({
  isActiveIdx: index("announcements_is_active_idx").on(table.isActive),
  publishAtIdx: index("announcements_publish_at_idx").on(table.publishAt),
  targetAudienceIdx: index("announcements_target_audience_idx").on(table.targetAudience),
}))

// System health metrics for monitoring
export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  metricName: varchar("metric_name", { length: 100 }).notNull(),
  metricValue: numeric("metric_value", { precision: 15, scale: 4 }).notNull(),
  metricUnit: varchar("metric_unit", { length: 20 }), // 'ms', 'mb', 'percentage', 'count'
  category: varchar("category", { length: 50 }).notNull(), // 'performance', 'usage', 'error', 'business'
  metadata: json("metadata"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  metricNameIdx: index("system_metrics_metric_name_idx").on(table.metricName),
  categoryIdx: index("system_metrics_category_idx").on(table.category),
  recordedAtIdx: index("system_metrics_recorded_at_idx").on(table.recordedAt),
}))


export const bookingSessions = pgTable("booking_sessions", {
  id: serial("id").primaryKey(),
  learnerId: integer("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id, { onDelete: "cascade" }),
  mentorSkillId: integer("mentor_skill_id").notNull().references(() => mentorSkills.id),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }).notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  totalCostCredits: integer("total_cost_credits").notNull(),
  escrowCredits: integer("escrow_credits").notNull(),
  sessionNotes: text("session_notes").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), 
  agoraChannelName: varchar("agora_channel_name", { length: 255 }),
  agoraChannelCreatedAt: timestamp("agora_channel_created_at", { withTimezone: true }),
  agoraCallStartedAt: timestamp("agora_call_started_at", { withTimezone: true }),
  agoraCallEndedAt: timestamp("agora_call_ended_at", { withTimezone: true }),
  learnerJoinedAt: timestamp("learner_joined_at", { withTimezone: true }),
  mentorJoinedAt: timestamp("mentor_joined_at", { withTimezone: true }),
  learnerLeftAt: timestamp("learner_left_at", { withTimezone: true }),
  mentorLeftAt: timestamp("mentor_left_at", { withTimezone: true }),
  learnerConnectionDurationMs: integer("learner_connection_duration_ms").default(0),
  mentorConnectionDurationMs: integer("mentor_connection_duration_ms").default(0),
  learnerActiveTimeMs: integer("learner_active_time_ms").default(0), // Total time learner was actively in session
  mentorActiveTimeMs: integer("mentor_active_time_ms").default(0), // Total time mentor was actively in session
  learnerLastActiveAt: timestamp("learner_last_active_at", { withTimezone: true }), // Last activity timestamp for learner
  mentorLastActiveAt: timestamp("mentor_last_active_at", { withTimezone: true }), // Last activity timestamp for mentor
  noShowCheckedAt: timestamp("no_show_checked_at", { withTimezone: true }),
  refundProcessedAt: timestamp("refund_processed_at", { withTimezone: true }),
  refundAmount: integer("refund_amount").default(0),
  penaltyAmount: integer("penalty_amount"),
  agoraRecordingId: varchar("agora_recording_id", { length: 255 }), // For cloud recording
  agoraRecordingUrl: varchar("agora_recording_url", { length: 512 }), // Recording playback URL
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  mentorResponseAt: timestamp("mentor_response_at", { withTimezone: true }), 
  mentorResponseMessage: text("mentor_response_message"), 
  rejectionReason: text("rejection_reason"), 
  cancelledBy: varchar("cancelled_by", { length: 20 }), // learner, mentor, system, admin
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  learnerRequestCount: integer("learner_request_count").default(1), // Track spam requests

  // Session feedback tracking
  learnerFeedbackSubmitted: boolean("learner_feedback_submitted").default(false),
  mentorFeedbackSubmitted: boolean("mentor_feedback_submitted").default(false),

  ...timestamps,
})


export const mentorReviews = pgTable("mentor_reviews", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  learnerId: integer("learner_id").notNull().references(() => learners.id),
  sessionId: integer("session_id").references(() => bookingSessions.id),
  reviewText: text("review_text").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  ...timestamps,
})

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'purchase', 'session_payment', 'session_refund', 'mentor_payout', 'admin_adjustment'
  direction: varchar("direction", { length: 10 }).notNull(), // 'credit', 'debit'
  amount: integer("amount").notNull(),
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  relatedSessionId: integer("related_session_id").references(() => bookingSessions.id),
  relatedPurchaseId: integer("related_purchase_id").references(() => creditPurchases.id),
  description: text("description"),
  metadata: json("metadata"), // Additional context data
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})


// MENTOR PAYOUTS
export const mentorPayouts = pgTable("mentor_payouts", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").notNull().references(() => bookingSessions.id, { onDelete: "cascade" }),
  earnedCredits: integer("earned_credits").notNull(), 
  platformFeeCredits: integer("platform_fee_credits").notNull(),
  feePercentage: integer("fee_percentage").default(20),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'released', 'paid_out', 'failed'
  releasedAt: timestamp("released_at", { withTimezone: true }), // When credits were released from escrow
  paidOutAt: timestamp("paid_out_at", { withTimezone: true }), // When actually paid to mentor
  payoutMethod: varchar("payout_method", { length: 50 }), // 'bank_transfer', 'paypal', etc.
  payoutReference: varchar("payout_reference", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// CREDIT WITHDRAWALS
export const creditWithdrawals = pgTable("credit_withdrawals", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id, { onDelete: "cascade" }),
  creditsAmount: integer("credits_amount").notNull(), // Credits being withdrawn
  usdAmount: numeric("usd_amount", { precision: 10, scale: 2 }).notNull(), // USD equivalent
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }).default("0").notNull(), // Platform fee in USD
  netAmount: numeric("net_amount", { precision: 10, scale: 2 }).notNull(), // Amount after fees
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  payoutMethod: varchar("payout_method", { length: 50 }).notNull(), // 'xendit_transfer', 'bank_account', etc.
  xenditDisbursementId: varchar("xendit_disbursement_id", { length: 255 }), // Xendit disbursement ID
  xenditChannelCode: varchar("xendit_channel_code", { length: 50 }), // Xendit channel (e.g., BPI, BDO)
  bankDetails: json("bank_details"), // Store bank account info if needed
  failureReason: text("failure_reason"), // If withdrawal fails
  processedAt: timestamp("processed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  metadata: json("metadata"), // Additional data
  ...timestamps,
})


// NOTIFICATIONS
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), 
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // 'session', 'purchase', 'payout'
  relatedEntityId: integer("related_entity_id"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// PENDING USERS TABLES
export const pendingLearners = pgTable("pending_learners", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  country: varchar("country", { length: 255 }).notNull(),
  experienceLevel: varchar("experience_level", { length: 100 }).notNull(),
  learningGoals: text("learning_goals").notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull(),
  verificationToken: varchar("verification_token", { length: 255 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const pendingMentors = pgTable("pending_mentors", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  profileUrl: varchar("profile_url", { length: 255 }),
  profilePictureUrl: varchar("profile_picture_url", { length: 255 }).notNull(),
  languagesSpoken: json("languages_spoken").notNull(),
  gender: varchar("gender", { length: 50 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull(),
  professionalTitle: varchar("professional_title", { length: 100 }),
  bio: text("bio"),
  yearsOfExperience: integer("years_of_experience").notNull(),
  linkedInUrl: varchar("linkedin_url", { length: 255 }).notNull(),
  socialLinks: json("social_links").notNull(),
  question1: text("question1").notNull(),
  question2: text("question2").notNull(),
  question3: text("question3").notNull(),
  verificationToken: varchar("verification_token", { length: 255 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const pendingMentorAvailability = pgTable("pending_mentor_availability", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => pendingMentors.id),
  day: varchar("day", { length: 20 }).notNull(),
  startTime: time("start_time").notNull(), // e.g. "09:00 AM"
  endTime: time("end_time").notNull(), // e.g. "11:00 PM"
  ...timestamps,
})

export const pendingMentorSkills = pgTable("pending_mentor_skills", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => pendingMentors.id),
  skillName: varchar("skill_name", { length: 100 }).notNull(),
  ratePerHour: integer("rate_per_hour").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 6 }).notNull(), // 6-digit verification code
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const sessionReports = pgTable("session_reports", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => bookingSessions.id, { onDelete: "cascade" }),
  reportedBy: integer("reported_by").notNull().references(() => users.id),
  reportedUser: integer("reported_user").notNull().references(() => users.id),
  reportType: varchar("report_type", { length: 50 }).notNull(), // 'abuse', 'harassment', 'technical_misconduct', 'other'
  reason: text("reason").notNull(),
  description: text("description"),
  evidenceUrl: varchar("evidence_url", { length: 512 }), // Screenshot/file evidence
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'investigating', 'resolved', 'dismissed'
  adminNotes: text("admin_notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...timestamps,
})

export const agoraTokens = pgTable("agora_tokens", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => bookingSessions.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelName: varchar("channel_name", { length: 255 }).notNull(),
  token: text("token").notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'host', 'participant'
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})





export const sessionFeedback = pgTable("session_feedback", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => bookingSessions.id, { onDelete: "cascade" }),
  reviewerUserId: integer("reviewer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reviewerRole: varchar("reviewer_role", { length: 20 }).notNull(), 

  overallRating: integer("overall_rating").notNull(),
  communicationRating: integer("communication_rating"),
  knowledgeRating: integer("knowledge_rating"),
  helpfulnessRating: integer("helpfulness_rating"),
  punctualityRating: integer("punctuality_rating"),

  feedbackText: text("feedback_text").notNull(),
  improvementSuggestions: text("improvement_suggestions"),
  mostValuableAspect: text("most_valuable_aspect"),

  sessionHighlights: text("session_highlights"), 
  sessionPace: varchar("session_pace", { length: 20 }), 
  wouldRecommend: boolean("would_recommend"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  sessionReviewerIdx: index("session_feedback_session_reviewer_idx").on(table.sessionId, table.reviewerRole),
}))

// Session chat messages (ephemeral chat during video sessions)
export const sessionMessages = pgTable("session_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => bookingSessions.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id),
  senderRole: varchar("sender_role", { length: 20 }).notNull(), // 'learner' or 'mentor'
  message: text("message").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("session_messages_session_idx").on(table.sessionId),
  sessionTimestampIdx: index("session_messages_session_timestamp_idx").on(table.sessionId, table.timestamp),
}))

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  learnerId: integer("learner_id").notNull().references(() => learners.id),
  mentorLastReadAt: timestamp("mentor_last_read_at", { withTimezone: true }),
  learnerLastReadAt: timestamp("learner_last_read_at", { withTimezone: true }),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (table) => ({
  uniqueMentorLearner: index("conversations_mentor_learner_idx").on(table.mentorId, table.learnerId),
}))

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 20 }).default("text").notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  isGloballyDeleted: boolean("is_globally_deleted").default(false).notNull(),
  globallyDeletedAt: timestamp("globally_deleted_at", { withTimezone: true }),
  replyToMessageId: integer("reply_to_message_id"),
  ...timestamps,
}, (table) => ({
  conversationIdx: index("messages_conversation_idx").on(table.conversationId),
  senderIdx: index("messages_sender_idx").on(table.senderId),
}))

export const messageAttachments = pgTable("message_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  systemFilename: varchar("system_filename", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 512 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  storagePath: varchar("storage_path", { length: 512 }),
  ...timestamps,
})

export const messageUserDeletions = pgTable("message_user_deletions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueMessageUser: index("message_user_deletions_unique_idx").on(table.messageId, table.userId),
}))

export const conversationUserDeletions = pgTable("conversation_user_deletions", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueConversationUser: index("conversation_user_deletions_unique_idx").on(table.conversationId, table.userId),
}))

// RELATIONS
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  mentor: one(mentors, {
    fields: [conversations.mentorId],
    references: [mentors.id],
  }),
  learner: one(learners, {
    fields: [conversations.learnerId],
    references: [learners.id],
  }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  attachments: many(messageAttachments),
  replyTo: one(messages, {
    fields: [messages.replyToMessageId],
    references: [messages.id],
  }),
}))

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, {
    fields: [messageAttachments.messageId],
    references: [messages.id],
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages),
  messageUserDeletions: many(messageUserDeletions),
  conversationUserDeletions: many(conversationUserDeletions),
}))

export const mentorsRelations = relations(mentors, ({ one, many }) => ({
  user: one(users, {
    fields: [mentors.userId],
    references: [users.id],
  }),
  conversations: many(conversations),
}))

export const learnersRelations = relations(learners, ({ one, many }) => ({
  user: one(users, {
    fields: [learners.userId],
    references: [users.id],
  }),
  conversations: many(conversations),
}))

// Session activity logs for audit trail and debugging
export const sessionLogs = pgTable("session_logs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => bookingSessions.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'status_changed', 'user_joined', 'user_left', 'payment_processed', 'refund_processed', 'admin_action', etc.
  actorType: varchar("actor_type", { length: 20 }).notNull(), // 'system', 'learner', 'mentor', 'admin'
  actorId: integer("actor_id").references(() => users.id),
  oldStatus: varchar("old_status", { length: 20 }),
  newStatus: varchar("new_status", { length: 20 }),
  description: text("description").notNull(),
  metadata: json("metadata"), // Additional context like IP, user agent, error details, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  sessionIdIdx: index("session_logs_session_id_idx").on(table.sessionId),
  eventTypeIdx: index("session_logs_event_type_idx").on(table.eventType),
  actorTypeIdx: index("session_logs_actor_type_idx").on(table.actorType),
  createdAtIdx: index("session_logs_created_at_idx").on(table.createdAt),
}))

// Session join/leave tracking to handle rapid join/leave cycles
export const sessionConnectionLogs = pgTable("session_connection_logs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => bookingSessions.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userRole: varchar("user_role", { length: 20 }).notNull(), // 'learner' or 'mentor'
  action: varchar("action", { length: 10 }).notNull(), // 'joined' or 'left'
  connectionDurationMs: integer("connection_duration_ms"), // How long they were connected (calculated on 'left')
  metadata: json("metadata"), // Browser info, connection quality, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  sessionUserIdx: index("session_connection_logs_session_user_idx").on(table.sessionId, table.userId),
  sessionIdx: index("session_connection_logs_session_idx").on(table.sessionId),
  createdAtIdx: index("session_connection_logs_created_at_idx").on(table.createdAt),
}))

// Refund requests from learners for disputed sessions
export const refundRequests = pgTable("refund_requests", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => bookingSessions.id, { onDelete: "cascade" }),
  requestedBy: integer("requested_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestReason: varchar("request_reason", { length: 50 }).notNull(), // 'technical_issues', 'mentor_no_show', 'quality_issues', 'other'
  detailedReason: text("detailed_reason").notNull(),
  evidenceUrls: json("evidence_urls"), // Screenshots, recordings, chat logs
  requestedAmount: integer("requested_amount").notNull(), // Credits requested
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'approved', 'rejected', 'escalated'
  reviewedBy: integer("reviewed_by").references(() => users.id), // Admin who reviewed
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  adminNotes: text("admin_notes"),
  responseMessage: text("response_message"), // Message to user explaining decision
  refundedAmount: integer("refunded_amount"), // Actual amount refunded (may differ from requested)
  refundProcessedAt: timestamp("refund_processed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => ({
  sessionIdIdx: index("refund_requests_session_id_idx").on(table.sessionId),
  requestedByIdx: index("refund_requests_requested_by_idx").on(table.requestedBy),
  statusIdx: index("refund_requests_status_idx").on(table.status),
  createdAtIdx: index("refund_requests_created_at_idx").on(table.createdAt),
}))

// TWO-FACTOR AUTHENTICATION TABLES
export const twoFactorSettings = pgTable("two_factor_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  ...timestamps,
}, (table) => ({
  userIdIdx: index("two_factor_settings_user_id_idx").on(table.userId),
}))

export const twoFactorCodes = pgTable("two_factor_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 6 }).notNull(), // 6-digit verification code
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(), // Temporary token for 2FA login flow
  attempts: integer("attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  sessionTokenIdx: index("two_factor_codes_session_token_idx").on(table.sessionToken),
  userIdIdx: index("two_factor_codes_user_id_idx").on(table.userId),
}))


