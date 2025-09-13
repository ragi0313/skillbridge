import { pgTable, serial, varchar, text, timestamp, integer, json, numeric, boolean, time, date } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}

// USERS TABLE
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("offline").notNull(),
  // Payment Provider Fields
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
  status: varchar("status", { length: 20 }).default("pending"), // pending, confirmed, ongoing, completed, cancelled, both_no_show, learner_no_show, mentor_no_show, rejected
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


// SESSION VISIBILITY - Hide/show sessions in management
export const sessionVisibility = pgTable("session_visibility", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => bookingSessions.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isHidden: boolean("is_hidden").default(false).notNull(),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  ...timestamps,
})

// CHAT SYSTEM TABLES
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id, { onDelete: "cascade" }),
  learnerId: integer("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  mentorLastReadAt: timestamp("mentor_last_read_at", { withTimezone: true }),
  learnerLastReadAt: timestamp("learner_last_read_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
})

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content"),
  messageType: varchar("message_type", { length: 20 }).default("text").notNull(),
  isEdited: boolean("is_edited").default(false).notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  replyToMessageId: integer("reply_to_message_id"), // Re move the reference here
  ...timestamps,
})
export const messageAttachments = pgTable("message_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 1024 }).notNull(), // Increased for blob URLs
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  blobPathname: varchar("blob_pathname", { length: 512 }), // For cleanup purposes
  ...timestamps,
})

// Per-user message deletions (soft delete per user)
export const messageUserDeletions = pgTable("message_user_deletions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
})

// Per-user conversation deletions (soft delete per user)
export const conversationUserDeletions = pgTable("conversation_user_deletions", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
})

// CHAT RELATIONS
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
  userDeletions: many(conversationUserDeletions),
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
  replyToMessage: one(messages, {
    fields: [messages.replyToMessageId],
    references: [messages.id],
  }),
  attachments: many(messageAttachments),
  userDeletions: many(messageUserDeletions),
}))

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, {
    fields: [messageAttachments.messageId],
    references: [messages.id],
  }),
}))

export const messageUserDeletionsRelations = relations(messageUserDeletions, ({ one }) => ({
  message: one(messages, {
    fields: [messageUserDeletions.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageUserDeletions.userId],
    references: [users.id],
  }),
}))

export const conversationUserDeletionsRelations = relations(conversationUserDeletions, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationUserDeletions.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationUserDeletions.userId],
    references: [users.id],
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages),
  deletedMessages: many(messageUserDeletions),
  deletedConversations: many(conversationUserDeletions),
}))


