import { relations } from "drizzle-orm/relations";
import { bookingSessions, agoraTokens, users, admins, creditTransactions, creditPurchases, mentors, creditWithdrawals, mentorAvailability, conversations, learners, mentorPayouts, mentorSkills, mentorBlockedDates, messages, messageUserDeletions, notifications, passwordResetTokens, mentorReviews, mentorSkillCategories, skillCategories, pendingMentors, pendingMentorAvailability, sessionReports, sessionVisibility, conversationUserDeletions, messageAttachments, pendingMentorSkills, sessionFeedback } from "./schema";

export const agoraTokensRelations = relations(agoraTokens, ({one}) => ({
	bookingSession: one(bookingSessions, {
		fields: [agoraTokens.sessionId],
		references: [bookingSessions.id]
	}),
	user: one(users, {
		fields: [agoraTokens.userId],
		references: [users.id]
	}),
}));

export const bookingSessionsRelations = relations(bookingSessions, ({one, many}) => ({
	agoraTokens: many(agoraTokens),
	creditTransactions: many(creditTransactions),
	mentorPayouts: many(mentorPayouts),
	learner: one(learners, {
		fields: [bookingSessions.learnerId],
		references: [learners.id]
	}),
	mentor: one(mentors, {
		fields: [bookingSessions.mentorId],
		references: [mentors.id]
	}),
	mentorSkill: one(mentorSkills, {
		fields: [bookingSessions.mentorSkillId],
		references: [mentorSkills.id]
	}),
	mentorReviews: many(mentorReviews),
	sessionReports: many(sessionReports),
	sessionVisibilities: many(sessionVisibility),
	sessionFeedbacks: many(sessionFeedback),
}));

export const usersRelations = relations(users, ({many}) => ({
	agoraTokens: many(agoraTokens),
	admins: many(admins),
	creditTransactions: many(creditTransactions),
	learners: many(learners),
	creditPurchases: many(creditPurchases),
	messageUserDeletions: many(messageUserDeletions),
	notifications: many(notifications),
	passwordResetTokens: many(passwordResetTokens),
	mentorSkillCategories: many(mentorSkillCategories),
	messages: many(messages),
	sessionReports_reportedBy: many(sessionReports, {
		relationName: "sessionReports_reportedBy_users_id"
	}),
	sessionReports_reportedUser: many(sessionReports, {
		relationName: "sessionReports_reportedUser_users_id"
	}),
	sessionReports_reviewedBy: many(sessionReports, {
		relationName: "sessionReports_reviewedBy_users_id"
	}),
	sessionVisibilities: many(sessionVisibility),
	conversationUserDeletions: many(conversationUserDeletions),
	mentors: many(mentors),
	sessionFeedbacks: many(sessionFeedback),
}));

export const adminsRelations = relations(admins, ({one}) => ({
	user: one(users, {
		fields: [admins.userId],
		references: [users.id]
	}),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({one}) => ({
	user: one(users, {
		fields: [creditTransactions.userId],
		references: [users.id]
	}),
	bookingSession: one(bookingSessions, {
		fields: [creditTransactions.relatedSessionId],
		references: [bookingSessions.id]
	}),
	creditPurchase: one(creditPurchases, {
		fields: [creditTransactions.relatedPurchaseId],
		references: [creditPurchases.id]
	}),
}));

export const creditPurchasesRelations = relations(creditPurchases, ({one, many}) => ({
	creditTransactions: many(creditTransactions),
	user: one(users, {
		fields: [creditPurchases.userId],
		references: [users.id]
	}),
}));

export const creditWithdrawalsRelations = relations(creditWithdrawals, ({one}) => ({
	mentor: one(mentors, {
		fields: [creditWithdrawals.mentorId],
		references: [mentors.id]
	}),
}));

export const mentorsRelations = relations(mentors, ({one, many}) => ({
	creditWithdrawals: many(creditWithdrawals),
	mentorAvailabilities: many(mentorAvailability),
	conversations: many(conversations),
	mentorPayouts: many(mentorPayouts),
	bookingSessions: many(bookingSessions),
	mentorBlockedDates: many(mentorBlockedDates),
	mentorSkills: many(mentorSkills),
	mentorReviews: many(mentorReviews),
	user: one(users, {
		fields: [mentors.userId],
		references: [users.id]
	}),
}));

export const mentorAvailabilityRelations = relations(mentorAvailability, ({one}) => ({
	mentor: one(mentors, {
		fields: [mentorAvailability.mentorId],
		references: [mentors.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	mentor: one(mentors, {
		fields: [conversations.mentorId],
		references: [mentors.id]
	}),
	learner: one(learners, {
		fields: [conversations.learnerId],
		references: [learners.id]
	}),
	messages: many(messages),
	conversationUserDeletions: many(conversationUserDeletions),
}));

export const learnersRelations = relations(learners, ({one, many}) => ({
	conversations: many(conversations),
	bookingSessions: many(bookingSessions),
	user: one(users, {
		fields: [learners.userId],
		references: [users.id]
	}),
	mentorReviews: many(mentorReviews),
}));

export const mentorPayoutsRelations = relations(mentorPayouts, ({one}) => ({
	mentor: one(mentors, {
		fields: [mentorPayouts.mentorId],
		references: [mentors.id]
	}),
	bookingSession: one(bookingSessions, {
		fields: [mentorPayouts.sessionId],
		references: [bookingSessions.id]
	}),
}));

export const mentorSkillsRelations = relations(mentorSkills, ({one, many}) => ({
	bookingSessions: many(bookingSessions),
	mentor: one(mentors, {
		fields: [mentorSkills.mentorId],
		references: [mentors.id]
	}),
	mentorSkillCategories: many(mentorSkillCategories),
}));

export const mentorBlockedDatesRelations = relations(mentorBlockedDates, ({one}) => ({
	mentor: one(mentors, {
		fields: [mentorBlockedDates.mentorId],
		references: [mentors.id]
	}),
}));

export const messageUserDeletionsRelations = relations(messageUserDeletions, ({one}) => ({
	message: one(messages, {
		fields: [messageUserDeletions.messageId],
		references: [messages.id]
	}),
	user: one(users, {
		fields: [messageUserDeletions.userId],
		references: [users.id]
	}),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
	messageUserDeletions: many(messageUserDeletions),
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [messages.senderId],
		references: [users.id]
	}),
	messageAttachments: many(messageAttachments),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const mentorReviewsRelations = relations(mentorReviews, ({one}) => ({
	mentor: one(mentors, {
		fields: [mentorReviews.mentorId],
		references: [mentors.id]
	}),
	learner: one(learners, {
		fields: [mentorReviews.learnerId],
		references: [learners.id]
	}),
	bookingSession: one(bookingSessions, {
		fields: [mentorReviews.sessionId],
		references: [bookingSessions.id]
	}),
}));

export const mentorSkillCategoriesRelations = relations(mentorSkillCategories, ({one}) => ({
	mentorSkill: one(mentorSkills, {
		fields: [mentorSkillCategories.mentorSkillId],
		references: [mentorSkills.id]
	}),
	skillCategory: one(skillCategories, {
		fields: [mentorSkillCategories.categoryId],
		references: [skillCategories.id]
	}),
	user: one(users, {
		fields: [mentorSkillCategories.createdBy],
		references: [users.id]
	}),
}));

export const skillCategoriesRelations = relations(skillCategories, ({many}) => ({
	mentorSkillCategories: many(mentorSkillCategories),
}));

export const pendingMentorAvailabilityRelations = relations(pendingMentorAvailability, ({one}) => ({
	pendingMentor: one(pendingMentors, {
		fields: [pendingMentorAvailability.mentorId],
		references: [pendingMentors.id]
	}),
}));

export const pendingMentorsRelations = relations(pendingMentors, ({many}) => ({
	pendingMentorAvailabilities: many(pendingMentorAvailability),
	pendingMentorSkills: many(pendingMentorSkills),
}));

export const sessionReportsRelations = relations(sessionReports, ({one}) => ({
	bookingSession: one(bookingSessions, {
		fields: [sessionReports.sessionId],
		references: [bookingSessions.id]
	}),
	user_reportedBy: one(users, {
		fields: [sessionReports.reportedBy],
		references: [users.id],
		relationName: "sessionReports_reportedBy_users_id"
	}),
	user_reportedUser: one(users, {
		fields: [sessionReports.reportedUser],
		references: [users.id],
		relationName: "sessionReports_reportedUser_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [sessionReports.reviewedBy],
		references: [users.id],
		relationName: "sessionReports_reviewedBy_users_id"
	}),
}));

export const sessionVisibilityRelations = relations(sessionVisibility, ({one}) => ({
	bookingSession: one(bookingSessions, {
		fields: [sessionVisibility.sessionId],
		references: [bookingSessions.id]
	}),
	user: one(users, {
		fields: [sessionVisibility.userId],
		references: [users.id]
	}),
}));

export const conversationUserDeletionsRelations = relations(conversationUserDeletions, ({one}) => ({
	conversation: one(conversations, {
		fields: [conversationUserDeletions.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [conversationUserDeletions.userId],
		references: [users.id]
	}),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({one}) => ({
	message: one(messages, {
		fields: [messageAttachments.messageId],
		references: [messages.id]
	}),
}));

export const pendingMentorSkillsRelations = relations(pendingMentorSkills, ({one}) => ({
	pendingMentor: one(pendingMentors, {
		fields: [pendingMentorSkills.mentorId],
		references: [pendingMentors.id]
	}),
}));

export const sessionFeedbackRelations = relations(sessionFeedback, ({one}) => ({
	bookingSession: one(bookingSessions, {
		fields: [sessionFeedback.sessionId],
		references: [bookingSessions.id]
	}),
	user: one(users, {
		fields: [sessionFeedback.reviewerUserId],
		references: [users.id]
	}),
}));