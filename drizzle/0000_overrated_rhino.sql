CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"profile_picture_url" varchar(512),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admins_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "agora_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"channel_name" varchar(255) NOT NULL,
	"token" text NOT NULL,
	"role" varchar(20) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_used" boolean DEFAULT false,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"learner_id" integer NOT NULL,
	"mentor_id" integer NOT NULL,
	"mentor_skill_id" integer NOT NULL,
	"scheduled_date" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"total_cost_credits" integer NOT NULL,
	"escrow_credits" integer NOT NULL,
	"session_notes" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"archived" boolean DEFAULT false,
	"agora_channel_name" varchar(255),
	"agora_channel_created_at" timestamp with time zone,
	"agora_call_started_at" timestamp with time zone,
	"agora_call_ended_at" timestamp with time zone,
	"learner_joined_at" timestamp with time zone,
	"mentor_joined_at" timestamp with time zone,
	"learner_left_at" timestamp with time zone,
	"mentor_left_at" timestamp with time zone,
	"learner_connection_duration_ms" integer DEFAULT 0,
	"mentor_connection_duration_ms" integer DEFAULT 0,
	"no_show_checked_at" timestamp with time zone,
	"refund_processed_at" timestamp with time zone,
	"refund_amount" integer DEFAULT 0,
	"penalty_amount" integer,
	"agora_recording_id" varchar(255),
	"agora_recording_url" varchar(512),
	"expires_at" timestamp with time zone NOT NULL,
	"mentor_response_at" timestamp with time zone,
	"mentor_response_message" text,
	"rejection_reason" text,
	"cancelled_by" varchar(20),
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"learner_request_count" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credit_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount_credits" integer NOT NULL,
	"amount_paid_usd" numeric(10, 2) NOT NULL,
	"local_amount" numeric(10, 2),
	"local_currency" varchar(10),
	"provider" varchar(50) NOT NULL,
	"payment_status" varchar(20) DEFAULT 'pending',
	"payment_reference" varchar(255),
	"external_id" varchar(255),
	"invoice_url" varchar(512),
	"webhook_data" json,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"amount" integer NOT NULL,
	"balance_before" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"related_session_id" integer,
	"related_purchase_id" integer,
	"description" text,
	"metadata" json,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "learners" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"country" varchar(100) NOT NULL,
	"experience_level" varchar(50) NOT NULL,
	"learning_goals" text NOT NULL,
	"credits_balance" integer DEFAULT 0 NOT NULL,
	"profile_url" varchar(255),
	"profile_picture_url" varchar(255),
	"timezone" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "learners_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "mentor_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" integer NOT NULL,
	"day" varchar(20) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentor_blocked_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" integer NOT NULL,
	"blocked_date" date NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentor_payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"earned_credits" integer NOT NULL,
	"platform_fee_credits" integer NOT NULL,
	"fee_percentage" integer DEFAULT 20,
	"status" varchar(20) DEFAULT 'pending',
	"released_at" timestamp with time zone,
	"paid_out_at" timestamp with time zone,
	"payout_method" varchar(50),
	"payout_reference" varchar(255),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentor_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" integer NOT NULL,
	"learner_id" integer NOT NULL,
	"session_id" integer,
	"review_text" text NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentor_skill_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_skill_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentor_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" integer NOT NULL,
	"skill_name" varchar(100) NOT NULL,
	"rate_per_hour" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentors" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"profile_url" varchar(255),
	"profile_picture_url" varchar(255) NOT NULL,
	"languages_spoken" json NOT NULL,
	"gender" varchar(50) NOT NULL,
	"country" varchar(100) NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"professional_title" varchar(100) NOT NULL,
	"bio" text,
	"years_of_experience" integer NOT NULL,
	"linkedin_url" varchar(255) NOT NULL,
	"social_links" json NOT NULL,
	"credits_balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "mentors_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"related_entity_type" varchar(50),
	"related_entity_id" integer,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" varchar(6) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_used" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pending_learners" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"hashed_password" varchar(255) NOT NULL,
	"country" varchar(255) NOT NULL,
	"experience_level" varchar(100) NOT NULL,
	"learning_goals" text NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"verification_token" varchar(255),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pending_learners_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "pending_mentor_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" integer NOT NULL,
	"day" varchar(20) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pending_mentor_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" integer NOT NULL,
	"skill_name" varchar(100) NOT NULL,
	"rate_per_hour" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pending_mentors" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"hashed_password" varchar(255) NOT NULL,
	"profile_url" varchar(255),
	"profile_picture_url" varchar(255) NOT NULL,
	"languages_spoken" json NOT NULL,
	"gender" varchar(50) NOT NULL,
	"country" varchar(100) NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"professional_title" varchar(100),
	"bio" text,
	"years_of_experience" integer NOT NULL,
	"linkedin_url" varchar(255) NOT NULL,
	"social_links" json NOT NULL,
	"question1" text NOT NULL,
	"question2" text NOT NULL,
	"question3" text NOT NULL,
	"verification_token" varchar(255),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pending_mentors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "session_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"reported_by" integer NOT NULL,
	"reported_user" integer NOT NULL,
	"report_type" varchar(50) NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"evidence_url" varchar(512),
	"status" varchar(20) DEFAULT 'pending',
	"admin_notes" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "skill_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "skill_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"hashed_password" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'offline' NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspension_ends_at" timestamp with time zone,
	"suspension_reason" text,
	"blacklisted_at" timestamp with time zone,
	"blacklist_reason" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" integer NOT NULL,
	"requested_credits" integer NOT NULL,
	"requested_amount_usd" numeric(10, 2) NOT NULL,
	"local_amount" numeric(10, 2),
	"local_currency" varchar(10),
	"status" varchar(20) DEFAULT 'pending',
	"payout_method" varchar(50) NOT NULL,
	"payout_details" json,
	"admin_notes" text,
	"processed_by" integer,
	"processed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agora_tokens" ADD CONSTRAINT "agora_tokens_session_id_booking_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."booking_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agora_tokens" ADD CONSTRAINT "agora_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_mentor_skill_id_mentor_skills_id_fk" FOREIGN KEY ("mentor_skill_id") REFERENCES "public"."mentor_skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_related_session_id_booking_sessions_id_fk" FOREIGN KEY ("related_session_id") REFERENCES "public"."booking_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_related_purchase_id_credit_purchases_id_fk" FOREIGN KEY ("related_purchase_id") REFERENCES "public"."credit_purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learners" ADD CONSTRAINT "learners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_availability" ADD CONSTRAINT "mentor_availability_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_blocked_dates" ADD CONSTRAINT "mentor_blocked_dates_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_payouts" ADD CONSTRAINT "mentor_payouts_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_payouts" ADD CONSTRAINT "mentor_payouts_session_id_booking_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."booking_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_reviews" ADD CONSTRAINT "mentor_reviews_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_reviews" ADD CONSTRAINT "mentor_reviews_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_reviews" ADD CONSTRAINT "mentor_reviews_session_id_booking_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."booking_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_skill_categories" ADD CONSTRAINT "mentor_skill_categories_mentor_skill_id_mentor_skills_id_fk" FOREIGN KEY ("mentor_skill_id") REFERENCES "public"."mentor_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_skill_categories" ADD CONSTRAINT "mentor_skill_categories_category_id_skill_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."skill_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_skill_categories" ADD CONSTRAINT "mentor_skill_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_skills" ADD CONSTRAINT "mentor_skills_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_mentor_availability" ADD CONSTRAINT "pending_mentor_availability_mentor_id_pending_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."pending_mentors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_mentor_skills" ADD CONSTRAINT "pending_mentor_skills_mentor_id_pending_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."pending_mentors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_reports" ADD CONSTRAINT "session_reports_session_id_booking_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."booking_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_reports" ADD CONSTRAINT "session_reports_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_reports" ADD CONSTRAINT "session_reports_reported_user_users_id_fk" FOREIGN KEY ("reported_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_reports" ADD CONSTRAINT "session_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;