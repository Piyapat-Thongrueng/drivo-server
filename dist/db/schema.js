"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handoverPhotos = exports.handovers = exports.payments = exports.bookingAddons = exports.bookings = exports.carAddons = exports.cars = exports.oneWayFees = exports.branches = exports.countries = exports.users = exports.usersInAuth = exports.userStatus = exports.userRole = exports.transmissionType = exports.paymentStatus = exports.paymentKind = exports.handoverType = exports.fuelType = exports.fuelLevel = exports.depositStatus = exports.carType = exports.carStatus = exports.bookingStatus = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.bookingStatus = (0, pg_core_1.pgEnum)("booking_status", ['pending_approval', 'approved', 'pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'rejected']);
exports.carStatus = (0, pg_core_1.pgEnum)("car_status", ['available', 'maintenance']);
exports.carType = (0, pg_core_1.pgEnum)("car_type", ['sedan', 'suv', 'van', 'hatchback', 'pickup']);
exports.depositStatus = (0, pg_core_1.pgEnum)("deposit_status", ['held', 'released', 'partial', 'forfeited']);
exports.fuelLevel = (0, pg_core_1.pgEnum)("fuel_level", ['full', 'three_quarters', 'half', 'quarter', 'empty']);
exports.fuelType = (0, pg_core_1.pgEnum)("fuel_type", ['gasoline', 'diesel', 'electric', 'hybrid']);
exports.handoverType = (0, pg_core_1.pgEnum)("handover_type", ['pickup', 'return']);
exports.paymentKind = (0, pg_core_1.pgEnum)("payment_kind", ['rental', 'deposit', 'refund']);
exports.paymentStatus = (0, pg_core_1.pgEnum)("payment_status", ['pending', 'paid', 'failed', 'refunded']);
exports.transmissionType = (0, pg_core_1.pgEnum)("transmission_type", ['auto', 'manual']);
exports.userRole = (0, pg_core_1.pgEnum)("user_role", ['user', 'branch_staff', 'super_admin']);
exports.userStatus = (0, pg_core_1.pgEnum)("user_status", ['active', 'suspended']);
const authSchema = (0, pg_core_1.pgSchema)("auth");
exports.usersInAuth = authSchema.table("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().notNull(),
});
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.bigserial)({ mode: "bigint" }).primaryKey().notNull(),
    authId: (0, pg_core_1.uuid)("auth_id").notNull(),
    role: (0, exports.userRole)().default('user').notNull(),
    status: (0, exports.userStatus)().default('active').notNull(),
    firstName: (0, pg_core_1.text)("first_name").default("").notNull(),
    lastName: (0, pg_core_1.text)("last_name").default("").notNull(),
    phone: (0, pg_core_1.text)(),
    avatarUrl: (0, pg_core_1.text)("avatar_url"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    branchId: (0, pg_core_1.bigint)("branch_id", { mode: "number" }),
    metadata: (0, pg_core_1.jsonb)().default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_users_auth_id").using("btree", table.authId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.index)("idx_users_branch_id").using("btree", table.branchId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.index)("idx_users_role").using("btree", table.role.asc().nullsLast().op("enum_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.branchId],
        foreignColumns: [exports.branches.id],
        name: "fk_users_branch"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.authId],
        foreignColumns: [exports.usersInAuth.id],
        name: "users_auth_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("users_auth_id_key").on(table.authId),
]);
exports.countries = (0, pg_core_1.pgTable)("countries", {
    id: (0, pg_core_1.bigserial)({ mode: "bigint" }).primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    code: (0, pg_core_1.char)({ length: 2 }).notNull(),
    currencyCode: (0, pg_core_1.char)("currency_code", { length: 3 }).notNull(),
    timezone: (0, pg_core_1.text)().notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_countries_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
    (0, pg_core_1.unique)("countries_code_key").on(table.code),
]);
exports.branches = (0, pg_core_1.pgTable)("branches", {
    id: (0, pg_core_1.bigserial)({ mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    countryId: (0, pg_core_1.bigint)("country_id", { mode: "number" }).notNull(),
    name: (0, pg_core_1.text)().notNull(),
    address: (0, pg_core_1.text)().notNull(),
    latitude: (0, pg_core_1.numeric)({ precision: 10, scale: 8 }),
    longitude: (0, pg_core_1.numeric)({ precision: 11, scale: 8 }),
    openingTime: (0, pg_core_1.time)("opening_time"),
    closingTime: (0, pg_core_1.time)("closing_time"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_branches_country_id").using("btree", table.countryId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.index)("idx_branches_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.countryId],
        foreignColumns: [exports.countries.id],
        name: "branches_country_id_fkey"
    }),
]);
exports.oneWayFees = (0, pg_core_1.pgTable)("one_way_fees", {
    id: (0, pg_core_1.bigserial)({ mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    fromBranchId: (0, pg_core_1.bigint)("from_branch_id", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    toBranchId: (0, pg_core_1.bigint)("to_branch_id", { mode: "number" }).notNull(),
    fee: (0, pg_core_1.numeric)({ precision: 10, scale: 2 }).default('0').notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_one_way_fees_from").using("btree", table.fromBranchId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.index)("idx_one_way_fees_to").using("btree", table.toBranchId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.fromBranchId],
        foreignColumns: [exports.branches.id],
        name: "one_way_fees_from_branch_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.toBranchId],
        foreignColumns: [exports.branches.id],
        name: "one_way_fees_to_branch_id_fkey"
    }),
    (0, pg_core_1.unique)("one_way_fees_from_branch_id_to_branch_id_key").on(table.fromBranchId, table.toBranchId),
    (0, pg_core_1.check)("chk_different_branches", (0, drizzle_orm_1.sql) `from_branch_id <> to_branch_id`),
]);
exports.cars = (0, pg_core_1.pgTable)("cars", {
    id: (0, pg_core_1.bigserial)({ mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    branchId: (0, pg_core_1.bigint)("branch_id", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    currentBranchId: (0, pg_core_1.bigint)("current_branch_id", { mode: "number" }).notNull(),
    make: (0, pg_core_1.text)().notNull(),
    model: (0, pg_core_1.text)().notNull(),
    year: (0, pg_core_1.smallint)().notNull(),
    color: (0, pg_core_1.text)().notNull(),
    licensePlate: (0, pg_core_1.text)("license_plate").notNull(),
    imageUrl: (0, pg_core_1.text)("image_url"),
    carType: (0, exports.carType)("car_type").notNull(),
    seats: (0, pg_core_1.smallint)().notNull(),
    luggageCapacity: (0, pg_core_1.smallint)("luggage_capacity").notNull(),
    doors: (0, pg_core_1.smallint)().default(4).notNull(),
    transmission: (0, exports.transmissionType)().notNull(),
    fuelType: (0, exports.fuelType)("fuel_type").notNull(),
    hourlyRate: (0, pg_core_1.numeric)("hourly_rate", { precision: 10, scale: 2 }).notNull(),
    dailyRate: (0, pg_core_1.numeric)("daily_rate", { precision: 10, scale: 2 }).notNull(),
    description: (0, pg_core_1.text)(),
    status: (0, exports.carStatus)().default('available').notNull(),
    metadata: (0, pg_core_1.jsonb)().default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)("idx_cars_car_type").using("btree", table.carType.asc().nullsLast().op("enum_ops")),
    (0, pg_core_1.index)("idx_cars_current_branch_id").using("btree", table.currentBranchId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.index)("idx_cars_deleted_at").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")).where((0, drizzle_orm_1.sql) `(deleted_at IS NULL)`),
    (0, pg_core_1.index)("idx_cars_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.branchId],
        foreignColumns: [exports.branches.id],
        name: "cars_branch_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.currentBranchId],
        foreignColumns: [exports.branches.id],
        name: "cars_current_branch_id_fkey"
    }),
    (0, pg_core_1.unique)("cars_license_plate_key").on(table.licensePlate),
]);
exports.carAddons = (0, pg_core_1.pgTable)("car_addons", {
    id: (0, pg_core_1.bigserial)({ mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    carId: (0, pg_core_1.bigint)("car_id", { mode: "number" }).notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    pricePerDay: (0, pg_core_1.numeric)("price_per_day", { precision: 10, scale: 2 }).notNull(),
    isAvailable: (0, pg_core_1.boolean)("is_available").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_car_addons_car_id").using("btree", table.carId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.carId],
        foreignColumns: [exports.cars.id],
        name: "car_addons_car_id_fkey"
    }).onDelete("cascade"),
]);
exports.bookings = (0, pg_core_1.pgTable)("bookings", {
    id: (0, pg_core_1.bigserial)({ mode: "bigint" }).primaryKey().notNull(),
    reference: (0, pg_core_1.text)().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: (0, pg_core_1.bigint)("user_id", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    carId: (0, pg_core_1.bigint)("car_id", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    pickupBranchId: (0, pg_core_1.bigint)("pickup_branch_id", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    dropoffBranchId: (0, pg_core_1.bigint)("dropoff_branch_id", { mode: "number" }).notNull(),
    pickupDatetime: (0, pg_core_1.timestamp)("pickup_datetime", { withTimezone: true, mode: 'string' }).notNull(),
    dropoffDatetime: (0, pg_core_1.timestamp)("dropoff_datetime", { withTimezone: true, mode: 'string' }).notNull(),
    actualPickupDatetime: (0, pg_core_1.timestamp)("actual_pickup_datetime", { withTimezone: true, mode: 'string' }),
    actualDropoffDatetime: (0, pg_core_1.timestamp)("actual_dropoff_datetime", { withTimezone: true, mode: 'string' }),
    hourlyRate: (0, pg_core_1.numeric)("hourly_rate", { precision: 10, scale: 2 }).notNull(),
    dailyRate: (0, pg_core_1.numeric)("daily_rate", { precision: 10, scale: 2 }).notNull(),
    baseAmount: (0, pg_core_1.numeric)("base_amount", { precision: 10, scale: 2 }),
    addonAmount: (0, pg_core_1.numeric)("addon_amount", { precision: 10, scale: 2 }).default('0').notNull(),
    oneWayFee: (0, pg_core_1.numeric)("one_way_fee", { precision: 10, scale: 2 }).default('0').notNull(),
    damageCharge: (0, pg_core_1.numeric)("damage_charge", { precision: 10, scale: 2 }).default('0').notNull(),
    fuelCharge: (0, pg_core_1.numeric)("fuel_charge", { precision: 10, scale: 2 }).default('0').notNull(),
    totalAmount: (0, pg_core_1.numeric)("total_amount", { precision: 10, scale: 2 }),
    depositAmount: (0, pg_core_1.numeric)("deposit_amount", { precision: 10, scale: 2 }).default('0').notNull(),
    depositStatus: (0, exports.depositStatus)("deposit_status").default('held').notNull(),
    currencyCode: (0, pg_core_1.char)("currency_code", { length: 3 }).notNull(),
    status: (0, exports.bookingStatus)().default('pending_approval').notNull(),
    rejectionNote: (0, pg_core_1.text)("rejection_note"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    approvedBy: (0, pg_core_1.bigint)("approved_by", { mode: "number" }),
    approvedAt: (0, pg_core_1.timestamp)("approved_at", { withTimezone: true, mode: 'string' }),
    paymentDeadline: (0, pg_core_1.timestamp)("payment_deadline", { withTimezone: true, mode: 'string' }),
    confirmedAt: (0, pg_core_1.timestamp)("confirmed_at", { withTimezone: true, mode: 'string' }),
    cancelledAt: (0, pg_core_1.timestamp)("cancelled_at", { withTimezone: true, mode: 'string' }),
    completedAt: (0, pg_core_1.timestamp)("completed_at", { withTimezone: true, mode: 'string' }),
    metadata: (0, pg_core_1.jsonb)().default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    depositForfeitAmount: (0, pg_core_1.numeric)("deposit_forfeit_amount", { precision: 10, scale: 2 }).default('0').notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_bookings_availability").using("btree", table.carId.asc().nullsLast().op("timestamptz_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.pickupDatetime.asc().nullsLast().op("enum_ops"), table.dropoffDatetime.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.index)("idx_bookings_car_id").using("btree", table.carId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.index)("idx_bookings_dropoff_branch").using("btree", table.dropoffBranchId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.index)("idx_bookings_payment_deadline").using("btree", table.paymentDeadline.asc().nullsLast().op("timestamptz_ops")).where((0, drizzle_orm_1.sql) `(status = 'approved'::booking_status)`),
    (0, pg_core_1.index)("idx_bookings_pickup_branch").using("btree", table.pickupBranchId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.index)("idx_bookings_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
    (0, pg_core_1.index)("idx_bookings_user_id").using("btree", table.userId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.approvedBy],
        foreignColumns: [exports.users.id],
        name: "bookings_approved_by_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.carId],
        foreignColumns: [exports.cars.id],
        name: "bookings_car_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.dropoffBranchId],
        foreignColumns: [exports.branches.id],
        name: "bookings_dropoff_branch_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.pickupBranchId],
        foreignColumns: [exports.branches.id],
        name: "bookings_pickup_branch_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "bookings_user_id_fkey"
    }),
    (0, pg_core_1.unique)("bookings_reference_key").on(table.reference),
    (0, pg_core_1.check)("chk_actual_dates", (0, drizzle_orm_1.sql) `(actual_dropoff_datetime IS NULL) OR (actual_pickup_datetime IS NULL) OR (actual_dropoff_datetime > actual_pickup_datetime)`),
    (0, pg_core_1.check)("chk_booking_dates", (0, drizzle_orm_1.sql) `dropoff_datetime > pickup_datetime`),
]);
exports.bookingAddons = (0, pg_core_1.pgTable)("booking_addons", {
    id: (0, pg_core_1.bigserial)({ mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    bookingId: (0, pg_core_1.bigint)("booking_id", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    addonId: (0, pg_core_1.bigint)("addon_id", { mode: "number" }).notNull(),
    name: (0, pg_core_1.text)().notNull(),
    pricePerDay: (0, pg_core_1.numeric)("price_per_day", { precision: 10, scale: 2 }).notNull(),
    totalPrice: (0, pg_core_1.numeric)("total_price", { precision: 10, scale: 2 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_booking_addons_booking_id").using("btree", table.bookingId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.addonId],
        foreignColumns: [exports.carAddons.id],
        name: "booking_addons_addon_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.bookingId],
        foreignColumns: [exports.bookings.id],
        name: "booking_addons_booking_id_fkey"
    }).onDelete("cascade"),
]);
exports.payments = (0, pg_core_1.pgTable)("payments", {
    id: (0, pg_core_1.bigserial)({ mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    bookingId: (0, pg_core_1.bigint)("booking_id", { mode: "number" }).notNull(),
    paymentType: (0, exports.paymentKind)("payment_type").default('rental').notNull(),
    stripePaymentIntentId: (0, pg_core_1.text)("stripe_payment_intent_id"),
    stripeCheckoutSessionId: (0, pg_core_1.text)("stripe_checkout_session_id"),
    amount: (0, pg_core_1.numeric)({ precision: 10, scale: 2 }).notNull(),
    currencyCode: (0, pg_core_1.char)("currency_code", { length: 3 }).notNull(),
    status: (0, exports.paymentStatus)().default('pending').notNull(),
    paidAt: (0, pg_core_1.timestamp)("paid_at", { withTimezone: true, mode: 'string' }),
    idempotencyKey: (0, pg_core_1.text)("idempotency_key"),
    metadata: (0, pg_core_1.jsonb)().default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_payments_booking_id").using("btree", table.bookingId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.index)("idx_payments_stripe_pi").using("btree", table.stripePaymentIntentId.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.bookingId],
        foreignColumns: [exports.bookings.id],
        name: "payments_booking_id_fkey"
    }),
    (0, pg_core_1.unique)("payments_stripe_payment_intent_id_key").on(table.stripePaymentIntentId),
    (0, pg_core_1.unique)("payments_idempotency_key_key").on(table.idempotencyKey),
]);
exports.handovers = (0, pg_core_1.pgTable)("handovers", {
    id: (0, pg_core_1.bigserial)({ mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    bookingId: (0, pg_core_1.bigint)("booking_id", { mode: "number" }).notNull(),
    type: (0, exports.handoverType)().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    branchId: (0, pg_core_1.bigint)("branch_id", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    handledBy: (0, pg_core_1.bigint)("handled_by", { mode: "number" }).notNull(),
    actualDatetime: (0, pg_core_1.timestamp)("actual_datetime", { withTimezone: true, mode: 'string' }).notNull(),
    fuelLevel: (0, exports.fuelLevel)("fuel_level").notNull(),
    damageNote: (0, pg_core_1.text)("damage_note"),
    extraCharge: (0, pg_core_1.numeric)("extra_charge", { precision: 10, scale: 2 }).default('0').notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_handovers_booking_id").using("btree", table.bookingId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.index)("idx_handovers_branch_date").using("btree", table.branchId.asc().nullsLast().op("int8_ops"), table.actualDatetime.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.index)("idx_handovers_branch_id").using("btree", table.branchId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.bookingId],
        foreignColumns: [exports.bookings.id],
        name: "handovers_booking_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.branchId],
        foreignColumns: [exports.branches.id],
        name: "handovers_branch_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.handledBy],
        foreignColumns: [exports.users.id],
        name: "handovers_handled_by_fkey"
    }),
    (0, pg_core_1.unique)("handovers_booking_id_type_key").on(table.bookingId, table.type),
]);
exports.handoverPhotos = (0, pg_core_1.pgTable)("handover_photos", {
    id: (0, pg_core_1.bigserial)({ mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    handoverId: (0, pg_core_1.bigint)("handover_id", { mode: "number" }).notNull(),
    storagePath: (0, pg_core_1.text)("storage_path").notNull(),
    url: (0, pg_core_1.text)().notNull(),
    angle: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_handover_photos_handover_id").using("btree", table.handoverId.asc().nullsLast().op("int8_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.handoverId],
        foreignColumns: [exports.handovers.id],
        name: "handover_photos_handover_id_fkey"
    }).onDelete("cascade"),
]);
