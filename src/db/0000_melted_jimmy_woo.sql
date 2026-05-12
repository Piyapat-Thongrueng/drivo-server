-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."booking_status" AS ENUM('pending_approval', 'approved', 'pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."car_status" AS ENUM('available', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."car_type" AS ENUM('sedan', 'suv', 'van', 'hatchback', 'pickup');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('held', 'released', 'partial', 'forfeited');--> statement-breakpoint
CREATE TYPE "public"."fuel_level" AS ENUM('full', 'three_quarters', 'half', 'quarter', 'empty');--> statement-breakpoint
CREATE TYPE "public"."fuel_type" AS ENUM('gasoline', 'diesel', 'electric', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."handover_type" AS ENUM('pickup', 'return');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('rental', 'deposit', 'refund');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."transmission_type" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'branch_staff', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auth_id" uuid NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"phone" text,
	"avatar_url" text,
	"branch_id" bigint,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_id_key" UNIQUE("auth_id")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "countries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" char(2) NOT NULL,
	"currency_code" char(3) NOT NULL,
	"timezone" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "countries_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"country_id" bigint NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"opening_time" time,
	"closing_time" time,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "one_way_fees" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"from_branch_id" bigint NOT NULL,
	"to_branch_id" bigint NOT NULL,
	"fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "one_way_fees_from_branch_id_to_branch_id_key" UNIQUE("from_branch_id","to_branch_id"),
	CONSTRAINT "chk_different_branches" CHECK (from_branch_id <> to_branch_id)
);
--> statement-breakpoint
CREATE TABLE "cars" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"branch_id" bigint NOT NULL,
	"current_branch_id" bigint NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" smallint NOT NULL,
	"color" text NOT NULL,
	"license_plate" text NOT NULL,
	"image_url" text,
	"car_type" "car_type" NOT NULL,
	"seats" smallint NOT NULL,
	"luggage_capacity" smallint NOT NULL,
	"doors" smallint DEFAULT 4 NOT NULL,
	"transmission" "transmission_type" NOT NULL,
	"fuel_type" "fuel_type" NOT NULL,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"daily_rate" numeric(10, 2) NOT NULL,
	"description" text,
	"status" "car_status" DEFAULT 'available' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "cars_license_plate_key" UNIQUE("license_plate")
);
--> statement-breakpoint
CREATE TABLE "car_addons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"car_id" bigint NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_per_day" numeric(10, 2) NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"user_id" bigint NOT NULL,
	"car_id" bigint NOT NULL,
	"pickup_branch_id" bigint NOT NULL,
	"dropoff_branch_id" bigint NOT NULL,
	"pickup_datetime" timestamp with time zone NOT NULL,
	"dropoff_datetime" timestamp with time zone NOT NULL,
	"actual_pickup_datetime" timestamp with time zone,
	"actual_dropoff_datetime" timestamp with time zone,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"daily_rate" numeric(10, 2) NOT NULL,
	"base_amount" numeric(10, 2),
	"addon_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"one_way_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"damage_charge" numeric(10, 2) DEFAULT '0' NOT NULL,
	"fuel_charge" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2),
	"deposit_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"deposit_status" "deposit_status" DEFAULT 'held' NOT NULL,
	"currency_code" char(3) NOT NULL,
	"status" "booking_status" DEFAULT 'pending_approval' NOT NULL,
	"rejection_note" text,
	"approved_by" bigint,
	"approved_at" timestamp with time zone,
	"payment_deadline" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deposit_forfeit_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "bookings_reference_key" UNIQUE("reference"),
	CONSTRAINT "chk_actual_dates" CHECK ((actual_dropoff_datetime IS NULL) OR (actual_pickup_datetime IS NULL) OR (actual_dropoff_datetime > actual_pickup_datetime)),
	CONSTRAINT "chk_booking_dates" CHECK (dropoff_datetime > pickup_datetime)
);
--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "booking_addons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"booking_id" bigint NOT NULL,
	"addon_id" bigint NOT NULL,
	"name" text NOT NULL,
	"price_per_day" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"booking_id" bigint NOT NULL,
	"payment_type" "payment_kind" DEFAULT 'rental' NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_checkout_session_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency_code" char(3) NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"idempotency_key" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_stripe_payment_intent_id_key" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "payments_idempotency_key_key" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "handovers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"booking_id" bigint NOT NULL,
	"type" "handover_type" NOT NULL,
	"branch_id" bigint NOT NULL,
	"handled_by" bigint NOT NULL,
	"actual_datetime" timestamp with time zone NOT NULL,
	"fuel_level" "fuel_level" NOT NULL,
	"damage_note" text,
	"extra_charge" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "handovers_booking_id_type_key" UNIQUE("booking_id","type")
);
--> statement-breakpoint
ALTER TABLE "handovers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "handover_photos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"handover_id" bigint NOT NULL,
	"storage_path" text NOT NULL,
	"url" text NOT NULL,
	"angle" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "fk_users_branch" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "one_way_fees" ADD CONSTRAINT "one_way_fees_from_branch_id_fkey" FOREIGN KEY ("from_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "one_way_fees" ADD CONSTRAINT "one_way_fees_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_current_branch_id_fkey" FOREIGN KEY ("current_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_addons" ADD CONSTRAINT "car_addons_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dropoff_branch_id_fkey" FOREIGN KEY ("dropoff_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pickup_branch_id_fkey" FOREIGN KEY ("pickup_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "public"."car_addons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handover_photos" ADD CONSTRAINT "handover_photos_handover_id_fkey" FOREIGN KEY ("handover_id") REFERENCES "public"."handovers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_auth_id" ON "users" USING btree ("auth_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_users_branch_id" ON "users" USING btree ("branch_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_countries_is_active" ON "countries" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_branches_country_id" ON "branches" USING btree ("country_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_branches_is_active" ON "branches" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_one_way_fees_from" ON "one_way_fees" USING btree ("from_branch_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_one_way_fees_to" ON "one_way_fees" USING btree ("to_branch_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_cars_car_type" ON "cars" USING btree ("car_type" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_cars_current_branch_id" ON "cars" USING btree ("current_branch_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_cars_deleted_at" ON "cars" USING btree ("deleted_at" timestamptz_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_cars_status" ON "cars" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_car_addons_car_id" ON "car_addons" USING btree ("car_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_availability" ON "bookings" USING btree ("car_id" timestamptz_ops,"status" timestamptz_ops,"pickup_datetime" enum_ops,"dropoff_datetime" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_car_id" ON "bookings" USING btree ("car_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_dropoff_branch" ON "bookings" USING btree ("dropoff_branch_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_payment_deadline" ON "bookings" USING btree ("payment_deadline" timestamptz_ops) WHERE (status = 'approved'::booking_status);--> statement-breakpoint
CREATE INDEX "idx_bookings_pickup_branch" ON "bookings" USING btree ("pickup_branch_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_user_id" ON "bookings" USING btree ("user_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_booking_addons_booking_id" ON "booking_addons" USING btree ("booking_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_payments_booking_id" ON "payments" USING btree ("booking_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_payments_stripe_pi" ON "payments" USING btree ("stripe_payment_intent_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_handovers_booking_id" ON "handovers" USING btree ("booking_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_handovers_branch_date" ON "handovers" USING btree ("branch_id" int8_ops,"actual_datetime" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_handovers_branch_id" ON "handovers" USING btree ("branch_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_handover_photos_handover_id" ON "handover_photos" USING btree ("handover_id" int8_ops);
*/