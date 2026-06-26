CREATE TABLE "gsc_keyword_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"keyword" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"position_avg" numeric(5, 2) NOT NULL,
	"ctr_pct" numeric(5, 2) NOT NULL,
	"date_range_start" date NOT NULL,
	"date_range_end" date NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gsc_keyword_metrics" ADD CONSTRAINT "gsc_keyword_metrics_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gsc_metrics_site_idx" ON "gsc_keyword_metrics" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "gsc_metrics_site_date_idx" ON "gsc_keyword_metrics" USING btree ("site_id","date_range_start");