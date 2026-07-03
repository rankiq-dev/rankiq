CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" text DEFAULT 'audit.complete' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_fired_at" timestamp with time zone,
	"last_status" integer,
	"failure_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_issues" ADD COLUMN "assigned_to" text;--> statement-breakpoint
ALTER TABLE "audit_issues" ADD COLUMN "fix_note" text;--> statement-breakpoint
ALTER TABLE "audit_issues" ADD COLUMN "verified_fixed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "client_label" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "audit_schedule" text DEFAULT 'weekly' NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "max_pages" integer DEFAULT 200 NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "crawl_delay_ms" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_audit_complete" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_weekly_digest" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_critical_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "webhooks_user_id_idx" ON "webhooks" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_share_token_unique" UNIQUE("share_token");