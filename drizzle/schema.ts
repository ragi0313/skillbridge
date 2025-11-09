import { pgTable, foreignKey, serial, integer, varchar, text, timestamp, boolean, unique, json, numeric, time, index, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const agoraTokens = pgTable("agora_tokens", {
	id: serial().primaryKey().notNull(),
	sessionId: integer("session_id").notNull(),
	userId: integer("user_id").notNull(),
	channelName: varchar("channel_name", { length: 255 }).notNull(),
	token: text().notNull(),
	role: varchar({ length: 20 }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	isUsed: boolean("is_used").default(false),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [bookingSessions.id],
			name: "agora_tokens_session_id_booking_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "agora_tokens_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const admins = pgTable("admins", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	profilePictureUrl: varchar("profile_picture_url", { length: 512 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "admins_user_id_users_id_fk"
		}),
	unique("admins_user_id_unique").on(table.userId),
]);

export const creditTransactions = pgTable("credit_transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: varchar({ length: 50 }).notNull(),
	direction: varchar({ length: 10 }).notNull(),
	amount: integer().notNull(),
	balanceBefore: integer("balance_before").notNull(),
	balanceAfter: integer("balance_after").notNull(),
	relatedSessionId: integer("related_session_id"),
	relatedPurchaseId: integer("related_purchase_id"),
	description: text(),
	metadata: json(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "credit_transactions_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.relatedSessionId],
			foreignColumns: [bookingSessions.id],
			name: "credit_transactions_related_session_id_booking_sessions_id_fk"
		}),
	foreignKey({
			columns: [table.relatedPurchaseId],
			foreignColumns: [creditPurchases.id],
			name: "credit_transactions_related_purchase_id_credit_purchases_id_fk"
		}),
]);

export const creditWithdrawals = pgTable("credit_withdrawals", {
	id: serial().primaryKey().notNull(),
	mentorId: integer("mentor_id").notNull(),
	creditsAmount: integer("credits_amount").notNull(),
	usdAmount: numeric("usd_amount", { precision: 10, scale:  2 }).notNull(),
	platformFee: numeric("platform_fee", { precision: 10, scale:  2 }).default('0').notNull(),
	netAmount: numeric("net_amount", { precision: 10, scale:  2 }).notNull(),
	status: varchar({ length: 20 }).default('pending'),
	payoutMethod: varchar("payout_method", { length: 50 }).notNull(),
	xenditDisbursementId: varchar("xendit_disbursement_id", { length: 255 }),
	xenditChannelCode: varchar("xendit_channel_code", { length: 50 }),
	bankDetails: json("bank_details"),
	failureReason: text("failure_reason"),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	metadata: json(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.mentorId],
			foreignColumns: [mentors.id],
			name: "credit_withdrawals_mentor_id_mentors_id_fk"
		}).onDelete("cascade"),
]);

export const mentorAvailability = pgTable("mentor_availability", {
	id: serial().primaryKey().notNull(),
	mentorId: integer("mentor_id").notNull(),
	day: varchar({ length: 20 }).notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.mentorId],
			foreignColumns: [mentors.id],
			name: "mentor_availability_mentor_id_mentors_id_fk"
		}),
]);

export const conversations = pgTable("conversations", {
	id: serial().primaryKey().notNull(),
	mentorId: integer("mentor_id").notNull(),
	learnerId: integer("learner_id").notNull(),
	mentorLastReadAt: timestamp("mentor_last_read_at", { withTimezone: true, mode: 'string' }),
	learnerLastReadAt: timestamp("learner_last_read_at", { withTimezone: true, mode: 'string' }),
	lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("conversations_mentor_learner_idx").using("btree", table.mentorId.asc().nullsLast().op("int4_ops"), table.learnerId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.mentorId],
			foreignColumns: [mentors.id],
			name: "conversations_mentor_id_mentors_id_fk"
		}),
	foreignKey({
			columns: [table.learnerId],
			foreignColumns: [learners.id],
			name: "conversations_learner_id_learners_id_fk"
		}),
]);

export const mentorPayouts = pgTable("mentor_payouts", {
	id: serial().primaryKey().notNull(),
	mentorId: integer("mentor_id").notNull(),
	sessionId: integer("session_id").notNull(),
	earnedCredits: integer("earned_credits").notNull(),
	platformFeeCredits: integer("platform_fee_credits").notNull(),
	feePercentage: integer("fee_percentage").default(20),
	status: varchar({ length: 20 }).default('pending'),
	releasedAt: timestamp("released_at", { withTimezone: true, mode: 'string' }),
	paidOutAt: timestamp("paid_out_at", { withTimezone: true, mode: 'string' }),
	payoutMethod: varchar("payout_method", { length: 50 }),
	payoutReference: varchar("payout_reference", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.mentorId],
			foreignColumns: [mentors.id],
			name: "mentor_payouts_mentor_id_mentors_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [bookingSessions.id],
			name: "mentor_payouts_session_id_booking_sessions_id_fk"
		}).onDelete("cascade"),
]);

export const bookingSessions = pgTable("booking_sessions", {
	id: serial().primaryKey().notNull(),
	learnerId: integer("learner_id").notNull(),
	mentorId: integer("mentor_id").notNull(),
	mentorSkillId: integer("mentor_skill_id").notNull(),
	scheduledDate: timestamp("scheduled_date", { withTimezone: true, mode: 'string' }).notNull(),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }).notNull(),
	durationMinutes: integer("duration_minutes").notNull(),
	totalCostCredits: integer("total_cost_credits").notNull(),
	escrowCredits: integer("escrow_credits").notNull(),
	sessionNotes: text("session_notes").notNull(),
	status: varchar({ length: 20 }).default('pending'),
	agoraChannelName: varchar("agora_channel_name", { length: 255 }),
	agoraChannelCreatedAt: timestamp("agora_channel_created_at", { withTimezone: true, mode: 'string' }),
	agoraCallStartedAt: timestamp("agora_call_started_at", { withTimezone: true, mode: 'string' }),
	agoraCallEndedAt: timestamp("agora_call_ended_at", { withTimezone: true, mode: 'string' }),
	learnerJoinedAt: timestamp("learner_joined_at", { withTimezone: true, mode: 'string' }),
	mentorJoinedAt: timestamp("mentor_joined_at", { withTimezone: true, mode: 'string' }),
	learnerLeftAt: timestamp("learner_left_at", { withTimezone: true, mode: 'string' }),
	mentorLeftAt: timestamp("mentor_left_at", { withTimezone: true, mode: 'string' }),
	learnerConnectionDurationMs: integer("learner_connection_duration_ms").default(0),
	mentorConnectionDurationMs: integer("mentor_connection_duration_ms").default(0),
	learnerActiveTimeMs: integer("learner_active_time_ms").default(0),
	mentorActiveTimeMs: integer("mentor_active_time_ms").default(0),
	learnerLastActiveAt: timestamp("learner_last_active_at", { withTimezone: true, mode: 'string' }),
	mentorLastActiveAt: timestamp("mentor_last_active_at", { withTimezone: true, mode: 'string' }),
	noShowCheckedAt: timestamp("no_show_checked_at", { withTimezone: true, mode: 'string' }),
	refundProcessedAt: timestamp("refund_processed_at", { withTimezone: true, mode: 'string' }),
	refundAmount: integer("refund_amount").default(0),
	penaltyAmount: integer("penalty_amount"),
	agoraRecordingId: varchar("agora_recording_id", { length: 255 }),
	agoraRecordingUrl: varchar("agora_recording_url", { length: 512 }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	mentorResponseAt: timestamp("mentor_response_at", { withTimezone: true, mode: 'string' }),
	mentorResponseMessage: text("mentor_response_message"),
	rejectionReason: text("rejection_reason"),
	cancelledBy: varchar("cancelled_by", { length: 20 }),
	cancellationReason: text("cancellation_reason"),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	learnerRequestCount: integer("learner_request_count").default(1),
	learnerFeedbackSubmitted: boolean("learner_feedback_submitted").default(false),
	mentorFeedbackSubmitted: boolean("mentor_feedback_submitted").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.learnerId],
			foreignColumns: [learners.id],
			name: "booking_sessions_learner_id_learners_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.mentorId],
			foreignColumns: [mentors.id],
			name: "booking_sessions_mentor_id_mentors_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.mentorSkillId],
			foreignColumns: [mentorSkills.id],
			name: "booking_sessions_mentor_skill_id_mentor_skills_id_fk"
		}),
]);

export const learners = pgTable("learners", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	country: varchar({ length: 100 }).notNull(),
	experienceLevel: varchar("experience_level", { length: 50 }).notNull(),
	learningGoals: text("learning_goals").notNull(),
	creditsBalance: integer("credits_balance").default(0).notNull(),
	profileUrl: varchar("profile_url", { length: 255 }),
	profilePictureUrl: varchar("profile_picture_url", { length: 255 }),
	timezone: varchar({ length: 100 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "learners_user_id_users_id_fk"
		}),
	unique("learners_user_id_unique").on(table.userId),
]);

export const creditPurchases = pgTable("credit_purchases", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	amountCredits: integer("amount_credits").notNull(),
	amountPaidUsd: numeric("amount_paid_usd", { precision: 10, scale:  2 }).notNull(),
	localAmount: numeric("local_amount", { precision: 10, scale:  2 }),
	localCurrency: varchar("local_currency", { length: 10 }),
	provider: varchar({ length: 50 }).notNull(),
	xenditInvoiceId: varchar("xendit_invoice_id", { length: 255 }),
	xenditPaymentId: varchar("xendit_payment_id", { length: 255 }),
	paymentStatus: varchar("payment_status", { length: 20 }).default('pending'),
	paymentReference: varchar("payment_reference", { length: 255 }),
	externalId: varchar("external_id", { length: 255 }),
	invoiceUrl: varchar("invoice_url", { length: 512 }),
	webhookData: json("webhook_data"),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "credit_purchases_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const mentorBlockedDates = pgTable("mentor_blocked_dates", {
	id: serial().primaryKey().notNull(),
	mentorId: integer("mentor_id").notNull(),
	blockedDate: date("blocked_date").notNull(),
	reason: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.mentorId],
			foreignColumns: [mentors.id],
			name: "mentor_blocked_dates_mentor_id_mentors_id_fk"
		}),
]);

export const mentorSkills = pgTable("mentor_skills", {
	id: serial().primaryKey().notNull(),
	mentorId: integer("mentor_id").notNull(),
	skillName: varchar("skill_name", { length: 100 }).notNull(),
	ratePerHour: integer("rate_per_hour").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.mentorId],
			foreignColumns: [mentors.id],
			name: "mentor_skills_mentor_id_mentors_id_fk"
		}),
]);

export const messageUserDeletions = pgTable("message_user_deletions", {
	id: serial().primaryKey().notNull(),
	messageId: integer("message_id").notNull(),
	userId: integer("user_id").notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("message_user_deletions_unique_idx").using("btree", table.messageId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "message_user_deletions_message_id_messages_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "message_user_deletions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	relatedEntityType: varchar("related_entity_type", { length: 50 }),
	relatedEntityId: integer("related_entity_id"),
	isRead: boolean("is_read").default(false),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	token: varchar({ length: 6 }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	isUsed: boolean("is_used").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_reset_tokens_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const pendingLearners = pgTable("pending_learners", {
	id: serial().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 255 }).notNull(),
	lastName: varchar("last_name", { length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
	country: varchar({ length: 255 }).notNull(),
	experienceLevel: varchar("experience_level", { length: 100 }).notNull(),
	learningGoals: text("learning_goals").notNull(),
	timezone: varchar({ length: 100 }).notNull(),
	verificationToken: varchar("verification_token", { length: 255 }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("pending_learners_email_unique").on(table.email),
]);

export const mentorReviews = pgTable("mentor_reviews", {
	id: serial().primaryKey().notNull(),
	mentorId: integer("mentor_id").notNull(),
	learnerId: integer("learner_id").notNull(),
	sessionId: integer("session_id"),
	reviewText: text("review_text").notNull(),
	rating: integer().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.mentorId],
			foreignColumns: [mentors.id],
			name: "mentor_reviews_mentor_id_mentors_id_fk"
		}),
	foreignKey({
			columns: [table.learnerId],
			foreignColumns: [learners.id],
			name: "mentor_reviews_learner_id_learners_id_fk"
		}),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [bookingSessions.id],
			name: "mentor_reviews_session_id_booking_sessions_id_fk"
		}),
]);

export const mentorSkillCategories = pgTable("mentor_skill_categories", {
	id: serial().primaryKey().notNull(),
	mentorSkillId: integer("mentor_skill_id").notNull(),
	categoryId: integer("category_id").notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.mentorSkillId],
			foreignColumns: [mentorSkills.id],
			name: "mentor_skill_categories_mentor_skill_id_mentor_skills_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [skillCategories.id],
			name: "mentor_skill_categories_category_id_skill_categories_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "mentor_skill_categories_created_by_users_id_fk"
		}),
]);

export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	conversationId: integer("conversation_id").notNull(),
	senderId: integer("sender_id").notNull(),
	content: text().notNull(),
	messageType: varchar("message_type", { length: 20 }).default('text').notNull(),
	editedAt: timestamp("edited_at", { withTimezone: true, mode: 'string' }),
	isGloballyDeleted: boolean("is_globally_deleted").default(false).notNull(),
	globallyDeletedAt: timestamp("globally_deleted_at", { withTimezone: true, mode: 'string' }),
	replyToMessageId: integer("reply_to_message_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("messages_conversation_idx").using("btree", table.conversationId.asc().nullsLast().op("int4_ops")),
	index("messages_sender_idx").using("btree", table.senderId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "messages_sender_id_users_id_fk"
		}),
]);

export const pendingMentorAvailability = pgTable("pending_mentor_availability", {
	id: serial().primaryKey().notNull(),
	mentorId: integer("mentor_id").notNull(),
	day: varchar({ length: 20 }).notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.mentorId],
			foreignColumns: [pendingMentors.id],
			name: "pending_mentor_availability_mentor_id_pending_mentors_id_fk"
		}),
]);

export const sessionReports = pgTable("session_reports", {
	id: serial().primaryKey().notNull(),
	sessionId: integer("session_id").notNull(),
	reportedBy: integer("reported_by").notNull(),
	reportedUser: integer("reported_user").notNull(),
	reportType: varchar("report_type", { length: 50 }).notNull(),
	reason: text().notNull(),
	description: text(),
	evidenceUrl: varchar("evidence_url", { length: 512 }),
	status: varchar({ length: 20 }).default('pending'),
	adminNotes: text("admin_notes"),
	reviewedBy: integer("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [bookingSessions.id],
			name: "session_reports_session_id_booking_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reportedBy],
			foreignColumns: [users.id],
			name: "session_reports_reported_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.reportedUser],
			foreignColumns: [users.id],
			name: "session_reports_reported_user_users_id_fk"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "session_reports_reviewed_by_users_id_fk"
		}),
]);

export const sessionVisibility = pgTable("session_visibility", {
	id: serial().primaryKey().notNull(),
	sessionId: integer("session_id").notNull(),
	userId: integer("user_id").notNull(),
	isHidden: boolean("is_hidden").default(false).notNull(),
	hiddenAt: timestamp("hidden_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [bookingSessions.id],
			name: "session_visibility_session_id_booking_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "session_visibility_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const conversationUserDeletions = pgTable("conversation_user_deletions", {
	id: serial().primaryKey().notNull(),
	conversationId: integer("conversation_id").notNull(),
	userId: integer("user_id").notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("conversation_user_deletions_unique_idx").using("btree", table.conversationId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "conversation_user_deletions_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "conversation_user_deletions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
	role: varchar({ length: 20 }).notNull(),
	xenditAccountId: varchar("xendit_account_id", { length: 255 }),
	xenditAccountStatus: varchar("xendit_account_status", { length: 50 }).default('none'),
	preferredPaymentProvider: varchar("preferred_payment_provider", { length: 20 }).default('xendit'),
	suspendedAt: timestamp("suspended_at", { withTimezone: true, mode: 'string' }),
	suspensionEndsAt: timestamp("suspension_ends_at", { withTimezone: true, mode: 'string' }),
	suspensionReason: text("suspension_reason"),
	blacklistedAt: timestamp("blacklisted_at", { withTimezone: true, mode: 'string' }),
	blacklistReason: text("blacklist_reason"),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const mentors = pgTable("mentors", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	profileUrl: varchar("profile_url", { length: 255 }),
	profilePictureUrl: varchar("profile_picture_url", { length: 255 }).notNull(),
	languagesSpoken: json("languages_spoken").notNull(),
	gender: varchar({ length: 50 }).notNull(),
	country: varchar({ length: 100 }).notNull(),
	timezone: varchar({ length: 100 }).notNull(),
	professionalTitle: varchar("professional_title", { length: 100 }).notNull(),
	bio: text(),
	yearsOfExperience: integer("years_of_experience").notNull(),
	linkedinUrl: varchar("linkedin_url", { length: 255 }).notNull(),
	socialLinks: json("social_links").notNull(),
	creditsBalance: integer("credits_balance").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "mentors_user_id_users_id_fk"
		}),
	unique("mentors_user_id_unique").on(table.userId),
]);

export const skillCategories = pgTable("skill_categories", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("skill_categories_name_unique").on(table.name),
]);

export const messageAttachments = pgTable("message_attachments", {
	id: serial().primaryKey().notNull(),
	messageId: integer("message_id").notNull(),
	originalFilename: varchar("original_filename", { length: 255 }).notNull(),
	systemFilename: varchar("system_filename", { length: 255 }).notNull(),
	fileUrl: varchar("file_url", { length: 512 }).notNull(),
	fileSize: integer("file_size").notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	storagePath: varchar("storage_path", { length: 512 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "message_attachments_message_id_messages_id_fk"
		}).onDelete("cascade"),
]);

export const pendingMentors = pgTable("pending_mentors", {
	id: serial().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
	profileUrl: varchar("profile_url", { length: 255 }),
	profilePictureUrl: varchar("profile_picture_url", { length: 255 }).notNull(),
	languagesSpoken: json("languages_spoken").notNull(),
	gender: varchar({ length: 50 }).notNull(),
	country: varchar({ length: 100 }).notNull(),
	timezone: varchar({ length: 100 }).notNull(),
	professionalTitle: varchar("professional_title", { length: 100 }),
	bio: text(),
	yearsOfExperience: integer("years_of_experience").notNull(),
	linkedinUrl: varchar("linkedin_url", { length: 255 }).notNull(),
	socialLinks: json("social_links").notNull(),
	question1: text().notNull(),
	question2: text().notNull(),
	question3: text().notNull(),
	verificationToken: varchar("verification_token", { length: 255 }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("pending_mentors_email_unique").on(table.email),
]);

export const pendingMentorSkills = pgTable("pending_mentor_skills", {
	id: serial().primaryKey().notNull(),
	mentorId: integer("mentor_id").notNull(),
	skillName: varchar("skill_name", { length: 100 }).notNull(),
	ratePerHour: integer("rate_per_hour").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.mentorId],
			foreignColumns: [pendingMentors.id],
			name: "pending_mentor_skills_mentor_id_pending_mentors_id_fk"
		}),
]);

export const sessionFeedback = pgTable("session_feedback", {
	id: serial().primaryKey().notNull(),
	sessionId: integer("session_id").notNull(),
	reviewerUserId: integer("reviewer_user_id").notNull(),
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
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("session_feedback_session_reviewer_idx").using("btree", table.sessionId.asc().nullsLast().op("int4_ops"), table.reviewerRole.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [bookingSessions.id],
			name: "session_feedback_session_id_booking_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reviewerUserId],
			foreignColumns: [users.id],
			name: "session_feedback_reviewer_user_id_users_id_fk"
		}).onDelete("cascade"),
]);
