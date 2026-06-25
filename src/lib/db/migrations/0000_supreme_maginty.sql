CREATE TABLE "contact" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"organization" text,
	"status" text,
	"tags" jsonb,
	"phones" jsonb,
	"emails" jsonb,
	"phone" text,
	"email" text,
	"source" text,
	"last_contact_date" timestamp with time zone,
	"last_contact_method" text,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "custom_field_registry" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "custom_field_registry_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"resource" text NOT NULL,
	"name" text NOT NULL,
	"field_type" text NOT NULL,
	"label" text,
	"searchable" boolean DEFAULT false NOT NULL,
	"enum_values" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"media_key" text PRIMARY KEY NOT NULL,
	"resource_record_key" text,
	"media_url" text,
	"media_type" text,
	"media_category" text,
	"media_order" integer,
	"caption" text,
	"image_width" integer,
	"image_height" integer,
	"modification_timestamp" timestamp with time zone,
	"extras" jsonb
);
--> statement-breakpoint
CREATE TABLE "member" (
	"member_key" text PRIMARY KEY NOT NULL,
	"member_mls_id" text,
	"member_full_name" text,
	"member_first_name" text,
	"member_last_name" text,
	"member_email" text,
	"member_preferred_phone" text,
	"member_type" text,
	"office_mls_id" text,
	"modification_timestamp" timestamp with time zone,
	"extras" jsonb
);
--> statement-breakpoint
CREATE TABLE "office" (
	"office_key" text PRIMARY KEY NOT NULL,
	"office_mls_id" text,
	"office_name" text,
	"office_phone" text,
	"office_email" text,
	"office_address1" text,
	"office_city" text,
	"office_state_or_province" text,
	"office_postal_code" text,
	"modification_timestamp" timestamp with time zone,
	"extras" jsonb
);
--> statement-breakpoint
CREATE TABLE "property" (
	"listing_key" text PRIMARY KEY NOT NULL,
	"listing_id" text,
	"slug" text NOT NULL,
	"slug_address" text,
	"mls_source" text NOT NULL,
	"mls_id" text NOT NULL,
	"property_type" text,
	"property_sub_type" text,
	"standard_status" text,
	"list_price" double precision,
	"current_price" double precision,
	"original_list_price" double precision,
	"bedrooms_total" integer,
	"beds_total" integer,
	"bathrooms_total_integer" integer,
	"bathrooms_full" integer,
	"bathrooms_half" integer,
	"bathrooms_total_decimal" double precision,
	"living_area" double precision,
	"building_area_total" double precision,
	"year_built" integer,
	"lot_size_sqft" double precision,
	"lot_size_acres" double precision,
	"pool_yn" boolean,
	"spa_yn" boolean,
	"view_yn" boolean,
	"view" text,
	"garage_spaces" integer,
	"stories" integer,
	"senior_community_yn" boolean,
	"unparsed_address" text,
	"street_name" text,
	"street_number" text,
	"city" text,
	"subdivision_name" text,
	"state_or_province" text,
	"postal_code" text,
	"county_or_parish" text,
	"latitude" double precision,
	"longitude" double precision,
	"geom" geometry(Point,4326),
	"on_market_date" timestamp with time zone,
	"days_on_market" integer,
	"cumulative_days_on_market" integer,
	"modification_timestamp" timestamp with time zone,
	"price_change_timestamp" timestamp with time zone,
	"primary_photo_url" text,
	"public_remarks" text,
	"list_agent_name" text NOT NULL,
	"list_agent_mls_id" text,
	"list_agent_preferred_phone" text,
	"list_office_name" text NOT NULL,
	"list_office_mls_id" text,
	"list_office_phone" text,
	"cma_stats" jsonb,
	"cashflow_stats" jsonb,
	"extras" jsonb,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "schema_migrations" (
	"version" text PRIMARY KEY NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_contact_status" ON "contact" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contact_last_contact_date" ON "contact" USING btree ("last_contact_date");--> statement-breakpoint
CREATE INDEX "idx_contact_created_at" ON "contact" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_field_registry_resource_name_key" ON "custom_field_registry" USING btree ("resource","name");--> statement-breakpoint
CREATE INDEX "idx_custom_field_registry_resource" ON "custom_field_registry" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "idx_media_resource_record_key" ON "media" USING btree ("resource_record_key");--> statement-breakpoint
CREATE INDEX "idx_media_modification_timestamp" ON "media" USING btree ("modification_timestamp");--> statement-breakpoint
CREATE INDEX "idx_member_member_mls_id" ON "member" USING btree ("member_mls_id");--> statement-breakpoint
CREATE INDEX "idx_member_office_mls_id" ON "member" USING btree ("office_mls_id");--> statement-breakpoint
CREATE INDEX "idx_member_modification_timestamp" ON "member" USING btree ("modification_timestamp");--> statement-breakpoint
CREATE INDEX "idx_office_office_mls_id" ON "office" USING btree ("office_mls_id");--> statement-breakpoint
CREATE INDEX "idx_office_modification_timestamp" ON "office" USING btree ("modification_timestamp");--> statement-breakpoint
CREATE INDEX "idx_property_listing_id" ON "property" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_property_slug" ON "property" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_property_slug_address" ON "property" USING btree ("slug_address");--> statement-breakpoint
CREATE INDEX "idx_property_mls_source" ON "property" USING btree ("mls_source");--> statement-breakpoint
CREATE INDEX "idx_property_mls_id" ON "property" USING btree ("mls_id");--> statement-breakpoint
CREATE INDEX "idx_property_property_type" ON "property" USING btree ("property_type");--> statement-breakpoint
CREATE INDEX "idx_property_standard_status" ON "property" USING btree ("standard_status");--> statement-breakpoint
CREATE INDEX "idx_property_list_price" ON "property" USING btree ("list_price");--> statement-breakpoint
CREATE INDEX "idx_property_bedrooms_total" ON "property" USING btree ("bedrooms_total");--> statement-breakpoint
CREATE INDEX "idx_property_beds_total" ON "property" USING btree ("beds_total");--> statement-breakpoint
CREATE INDEX "idx_property_bathrooms_total_integer" ON "property" USING btree ("bathrooms_total_integer");--> statement-breakpoint
CREATE INDEX "idx_property_year_built" ON "property" USING btree ("year_built");--> statement-breakpoint
CREATE INDEX "idx_property_pool_yn" ON "property" USING btree ("pool_yn");--> statement-breakpoint
CREATE INDEX "idx_property_unparsed_address" ON "property" USING btree ("unparsed_address");--> statement-breakpoint
CREATE INDEX "idx_property_city" ON "property" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_property_subdivision_name" ON "property" USING btree ("subdivision_name");--> statement-breakpoint
CREATE INDEX "idx_property_postal_code" ON "property" USING btree ("postal_code");--> statement-breakpoint
CREATE INDEX "idx_property_on_market_date" ON "property" USING btree ("on_market_date");--> statement-breakpoint
CREATE INDEX "idx_property_modification_timestamp" ON "property" USING btree ("modification_timestamp");--> statement-breakpoint
CREATE INDEX "idx_property_price_change_timestamp" ON "property" USING btree ("price_change_timestamp");