import { pgTable, pgSchema, index, foreignKey, unique, bigserial, uuid, text, bigint, jsonb, timestamp, char, boolean, numeric, time, check, smallint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const bookingStatus = pgEnum("booking_status", ['pending_approval', 'approved', 'pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'rejected'])
export const carStatus = pgEnum("car_status", ['available', 'maintenance'])
export const carType = pgEnum("car_type", ['sedan', 'suv', 'van', 'hatchback', 'pickup'])
export const depositStatus = pgEnum("deposit_status", ['held', 'released', 'partial', 'forfeited'])
export const fuelLevel = pgEnum("fuel_level", ['full', 'three_quarters', 'half', 'quarter', 'empty'])
export const fuelType = pgEnum("fuel_type", ['gasoline', 'diesel', 'electric', 'hybrid'])
export const handoverType = pgEnum("handover_type", ['pickup', 'return'])
export const paymentKind = pgEnum("payment_kind", ['rental', 'deposit', 'refund'])
export const paymentStatus = pgEnum("payment_status", ['pending', 'paid', 'failed', 'refunded'])
export const transmissionType = pgEnum("transmission_type", ['auto', 'manual'])
export const userRole = pgEnum("user_role", ['user', 'branch_staff', 'super_admin'])
export const userStatus = pgEnum("user_status", ['active', 'suspended'])

const authSchema = pgSchema("auth")

export const usersInAuth = authSchema.table("users", {
	id: uuid("id").primaryKey().notNull(),
})


export const users = pgTable("users", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	authId: uuid("auth_id").notNull(),
	role: userRole().default('user').notNull(),
	status: userStatus().default('active').notNull(),
	firstName: text("first_name").default("").notNull(),
	lastName: text("last_name").default("").notNull(),
	phone: text(),
	avatarUrl: text("avatar_url"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	branchId: bigint("branch_id", { mode: "number" }),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_users_auth_id").using("btree", table.authId.asc().nullsLast().op("uuid_ops")),
	index("idx_users_branch_id").using("btree", table.branchId.asc().nullsLast().op("int8_ops")),
	index("idx_users_role").using("btree", table.role.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "fk_users_branch"
		}),
	foreignKey({
			columns: [table.authId],
			foreignColumns: [usersInAuth.id],
			name: "users_auth_id_fkey"
		}).onDelete("cascade"),
	unique("users_auth_id_key").on(table.authId),
]);

export const countries = pgTable("countries", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	name: text().notNull(),
	code: char({ length: 2 }).notNull(),
	currencyCode: char("currency_code", { length: 3 }).notNull(),
	timezone: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	defaultDepositAmount: numeric("default_deposit_amount", { precision: 10, scale:  2 }).default('5000').notNull(),
}, (table) => [
	index("idx_countries_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	unique("countries_code_key").on(table.code),
]);

export const branches = pgTable("branches", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	countryId: bigint("country_id", { mode: "number" }).notNull(),
	name: text().notNull(),
	address: text().notNull(),
	latitude: numeric({ precision: 10, scale:  8 }),
	longitude: numeric({ precision: 11, scale:  8 }),
	openingTime: time("opening_time"),
	closingTime: time("closing_time"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_branches_country_id").using("btree", table.countryId.asc().nullsLast().op("int8_ops")),
	index("idx_branches_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.countryId],
			foreignColumns: [countries.id],
			name: "branches_country_id_fkey"
		}),
]);

export const oneWayFees = pgTable("one_way_fees", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fromBranchId: bigint("from_branch_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	toBranchId: bigint("to_branch_id", { mode: "number" }).notNull(),
	fee: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_one_way_fees_from").using("btree", table.fromBranchId.asc().nullsLast().op("int8_ops")),
	index("idx_one_way_fees_to").using("btree", table.toBranchId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.fromBranchId],
			foreignColumns: [branches.id],
			name: "one_way_fees_from_branch_id_fkey"
		}),
	foreignKey({
			columns: [table.toBranchId],
			foreignColumns: [branches.id],
			name: "one_way_fees_to_branch_id_fkey"
		}),
	unique("one_way_fees_from_branch_id_to_branch_id_key").on(table.fromBranchId, table.toBranchId),
	check("chk_different_branches", sql`from_branch_id <> to_branch_id`),
]);

export const cars = pgTable("cars", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	branchId: bigint("branch_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	currentBranchId: bigint("current_branch_id", { mode: "number" }).notNull(),
	make: text().notNull(),
	model: text().notNull(),
	year: smallint().notNull(),
	color: text().notNull(),
	licensePlate: text("license_plate").notNull(),
	imageUrl: text("image_url"),
	carType: carType("car_type").notNull(),
	seats: smallint().notNull(),
	luggageCapacity: smallint("luggage_capacity").notNull(),
	doors: smallint().default(4).notNull(),
	transmission: transmissionType().notNull(),
	fuelType: fuelType("fuel_type").notNull(),
	hourlyRate: numeric("hourly_rate", { precision: 10, scale:  2 }).notNull(),
	dailyRate: numeric("daily_rate", { precision: 10, scale:  2 }).notNull(),
	description: text(),
	status: carStatus().default('available').notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_cars_car_type").using("btree", table.carType.asc().nullsLast().op("enum_ops")),
	index("idx_cars_current_branch_id").using("btree", table.currentBranchId.asc().nullsLast().op("int8_ops")),
	index("idx_cars_deleted_at").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_cars_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "cars_branch_id_fkey"
		}),
	foreignKey({
			columns: [table.currentBranchId],
			foreignColumns: [branches.id],
			name: "cars_current_branch_id_fkey"
		}),
	unique("cars_license_plate_key").on(table.licensePlate),
]);

export const carAddons = pgTable("car_addons", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	carId: bigint("car_id", { mode: "number" }).notNull(),
	name: text().notNull(),
	description: text(),
	pricePerDay: numeric("price_per_day", { precision: 10, scale:  2 }).notNull(),
	isAvailable: boolean("is_available").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_car_addons_car_id").using("btree", table.carId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.carId],
			foreignColumns: [cars.id],
			name: "car_addons_car_id_fkey"
		}).onDelete("cascade"),
]);

export const bookings = pgTable("bookings", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	reference: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	carId: bigint("car_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pickupBranchId: bigint("pickup_branch_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	dropoffBranchId: bigint("dropoff_branch_id", { mode: "number" }).notNull(),
	pickupDatetime: timestamp("pickup_datetime", { withTimezone: true, mode: 'string' }).notNull(),
	dropoffDatetime: timestamp("dropoff_datetime", { withTimezone: true, mode: 'string' }).notNull(),
	actualPickupDatetime: timestamp("actual_pickup_datetime", { withTimezone: true, mode: 'string' }),
	actualDropoffDatetime: timestamp("actual_dropoff_datetime", { withTimezone: true, mode: 'string' }),
	hourlyRate: numeric("hourly_rate", { precision: 10, scale:  2 }).notNull(),
	dailyRate: numeric("daily_rate", { precision: 10, scale:  2 }).notNull(),
	baseAmount: numeric("base_amount", { precision: 10, scale:  2 }),
	addonAmount: numeric("addon_amount", { precision: 10, scale:  2 }).default('0').notNull(),
	oneWayFee: numeric("one_way_fee", { precision: 10, scale:  2 }).default('0').notNull(),
	damageCharge: numeric("damage_charge", { precision: 10, scale:  2 }).default('0').notNull(),
	fuelCharge: numeric("fuel_charge", { precision: 10, scale:  2 }).default('0').notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }),
	depositAmount: numeric("deposit_amount", { precision: 10, scale:  2 }).default('0').notNull(),
	depositStatus: depositStatus("deposit_status").default('held').notNull(),
	currencyCode: char("currency_code", { length: 3 }).notNull(),
	status: bookingStatus().default('pending_approval').notNull(),
	rejectionNote: text("rejection_note"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	approvedBy: bigint("approved_by", { mode: "number" }),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	paymentDeadline: timestamp("payment_deadline", { withTimezone: true, mode: 'string' }),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	depositForfeitAmount: numeric("deposit_forfeit_amount", { precision: 10, scale:  2 }).default('0').notNull(),
}, (table) => [
	index("idx_bookings_availability").using("btree", table.carId.asc().nullsLast().op("timestamptz_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.pickupDatetime.asc().nullsLast().op("enum_ops"), table.dropoffDatetime.asc().nullsLast().op("int8_ops")),
	index("idx_bookings_car_id").using("btree", table.carId.asc().nullsLast().op("int8_ops")),
	index("idx_bookings_dropoff_branch").using("btree", table.dropoffBranchId.asc().nullsLast().op("int8_ops")),
	index("idx_bookings_payment_deadline").using("btree", table.paymentDeadline.asc().nullsLast().op("timestamptz_ops")).where(sql`(status = 'approved'::booking_status)`),
	index("idx_bookings_pickup_branch").using("btree", table.pickupBranchId.asc().nullsLast().op("int8_ops")),
	index("idx_bookings_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_bookings_user_id").using("btree", table.userId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "bookings_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.carId],
			foreignColumns: [cars.id],
			name: "bookings_car_id_fkey"
		}),
	foreignKey({
			columns: [table.dropoffBranchId],
			foreignColumns: [branches.id],
			name: "bookings_dropoff_branch_id_fkey"
		}),
	foreignKey({
			columns: [table.pickupBranchId],
			foreignColumns: [branches.id],
			name: "bookings_pickup_branch_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bookings_user_id_fkey"
		}),
	unique("bookings_reference_key").on(table.reference),
	check("chk_actual_dates", sql`(actual_dropoff_datetime IS NULL) OR (actual_pickup_datetime IS NULL) OR (actual_dropoff_datetime > actual_pickup_datetime)`),
	check("chk_booking_dates", sql`dropoff_datetime > pickup_datetime`),
]);

export const bookingAddons = pgTable("booking_addons", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	bookingId: bigint("booking_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	addonId: bigint("addon_id", { mode: "number" }).notNull(),
	name: text().notNull(),
	pricePerDay: numeric("price_per_day", { precision: 10, scale:  2 }).notNull(),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_booking_addons_booking_id").using("btree", table.bookingId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.addonId],
			foreignColumns: [carAddons.id],
			name: "booking_addons_addon_id_fkey"
		}),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.id],
			name: "booking_addons_booking_id_fkey"
		}).onDelete("cascade"),
]);

export const payments = pgTable("payments", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	bookingId: bigint("booking_id", { mode: "number" }).notNull(),
	paymentType: paymentKind("payment_type").default('rental').notNull(),
	stripePaymentIntentId: text("stripe_payment_intent_id"),
	stripeCheckoutSessionId: text("stripe_checkout_session_id"),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currencyCode: char("currency_code", { length: 3 }).notNull(),
	status: paymentStatus().default('pending').notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	idempotencyKey: text("idempotency_key"),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payments_booking_id").using("btree", table.bookingId.asc().nullsLast().op("int8_ops")),
	index("idx_payments_stripe_pi").using("btree", table.stripePaymentIntentId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.id],
			name: "payments_booking_id_fkey"
		}),
	unique("payments_stripe_payment_intent_id_key").on(table.stripePaymentIntentId),
	unique("payments_idempotency_key_key").on(table.idempotencyKey),
]);

export const handovers = pgTable("handovers", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	bookingId: bigint("booking_id", { mode: "number" }).notNull(),
	type: handoverType().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	branchId: bigint("branch_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	handledBy: bigint("handled_by", { mode: "number" }).notNull(),
	actualDatetime: timestamp("actual_datetime", { withTimezone: true, mode: 'string' }).notNull(),
	fuelLevel: fuelLevel("fuel_level").notNull(),
	damageNote: text("damage_note"),
	extraCharge: numeric("extra_charge", { precision: 10, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_handovers_booking_id").using("btree", table.bookingId.asc().nullsLast().op("int8_ops")),
	index("idx_handovers_branch_date").using("btree", table.branchId.asc().nullsLast().op("int8_ops"), table.actualDatetime.asc().nullsLast().op("int8_ops")),
	index("idx_handovers_branch_id").using("btree", table.branchId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.id],
			name: "handovers_booking_id_fkey"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "handovers_branch_id_fkey"
		}),
	foreignKey({
			columns: [table.handledBy],
			foreignColumns: [users.id],
			name: "handovers_handled_by_fkey"
		}),
	unique("handovers_booking_id_type_key").on(table.bookingId, table.type),
]);

export const handoverPhotos = pgTable("handover_photos", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	handoverId: bigint("handover_id", { mode: "number" }).notNull(),
	storagePath: text("storage_path").notNull(),
	url: text().notNull(),
	angle: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_handover_photos_handover_id").using("btree", table.handoverId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.handoverId],
			foreignColumns: [handovers.id],
			name: "handover_photos_handover_id_fkey"
		}).onDelete("cascade"),
]);
