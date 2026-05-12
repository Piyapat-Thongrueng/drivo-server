"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handoverPhotosRelations = exports.handoversRelations = exports.paymentsRelations = exports.bookingAddonsRelations = exports.bookingsRelations = exports.carAddonsRelations = exports.carsRelations = exports.oneWayFeesRelations = exports.countriesRelations = exports.usersInAuthRelations = exports.branchesRelations = exports.usersRelations = void 0;
const relations_1 = require("drizzle-orm/relations");
const schema_1 = require("./schema");
exports.usersRelations = (0, relations_1.relations)(schema_1.users, ({ one, many }) => ({
    branch: one(schema_1.branches, {
        fields: [schema_1.users.branchId],
        references: [schema_1.branches.id]
    }),
    usersInAuth: one(schema_1.usersInAuth, {
        fields: [schema_1.users.authId],
        references: [schema_1.usersInAuth.id]
    }),
    bookings_approvedBy: many(schema_1.bookings, {
        relationName: "bookings_approvedBy_users_id"
    }),
    bookings_userId: many(schema_1.bookings, {
        relationName: "bookings_userId_users_id"
    }),
    handovers: many(schema_1.handovers),
}));
exports.branchesRelations = (0, relations_1.relations)(schema_1.branches, ({ one, many }) => ({
    users: many(schema_1.users),
    country: one(schema_1.countries, {
        fields: [schema_1.branches.countryId],
        references: [schema_1.countries.id]
    }),
    oneWayFees_fromBranchId: many(schema_1.oneWayFees, {
        relationName: "oneWayFees_fromBranchId_branches_id"
    }),
    oneWayFees_toBranchId: many(schema_1.oneWayFees, {
        relationName: "oneWayFees_toBranchId_branches_id"
    }),
    cars_branchId: many(schema_1.cars, {
        relationName: "cars_branchId_branches_id"
    }),
    cars_currentBranchId: many(schema_1.cars, {
        relationName: "cars_currentBranchId_branches_id"
    }),
    bookings_dropoffBranchId: many(schema_1.bookings, {
        relationName: "bookings_dropoffBranchId_branches_id"
    }),
    bookings_pickupBranchId: many(schema_1.bookings, {
        relationName: "bookings_pickupBranchId_branches_id"
    }),
    handovers: many(schema_1.handovers),
}));
exports.usersInAuthRelations = (0, relations_1.relations)(schema_1.usersInAuth, ({ many }) => ({
    users: many(schema_1.users),
}));
exports.countriesRelations = (0, relations_1.relations)(schema_1.countries, ({ many }) => ({
    branches: many(schema_1.branches),
}));
exports.oneWayFeesRelations = (0, relations_1.relations)(schema_1.oneWayFees, ({ one }) => ({
    branch_fromBranchId: one(schema_1.branches, {
        fields: [schema_1.oneWayFees.fromBranchId],
        references: [schema_1.branches.id],
        relationName: "oneWayFees_fromBranchId_branches_id"
    }),
    branch_toBranchId: one(schema_1.branches, {
        fields: [schema_1.oneWayFees.toBranchId],
        references: [schema_1.branches.id],
        relationName: "oneWayFees_toBranchId_branches_id"
    }),
}));
exports.carsRelations = (0, relations_1.relations)(schema_1.cars, ({ one, many }) => ({
    branch_branchId: one(schema_1.branches, {
        fields: [schema_1.cars.branchId],
        references: [schema_1.branches.id],
        relationName: "cars_branchId_branches_id"
    }),
    branch_currentBranchId: one(schema_1.branches, {
        fields: [schema_1.cars.currentBranchId],
        references: [schema_1.branches.id],
        relationName: "cars_currentBranchId_branches_id"
    }),
    carAddons: many(schema_1.carAddons),
    bookings: many(schema_1.bookings),
}));
exports.carAddonsRelations = (0, relations_1.relations)(schema_1.carAddons, ({ one, many }) => ({
    car: one(schema_1.cars, {
        fields: [schema_1.carAddons.carId],
        references: [schema_1.cars.id]
    }),
    bookingAddons: many(schema_1.bookingAddons),
}));
exports.bookingsRelations = (0, relations_1.relations)(schema_1.bookings, ({ one, many }) => ({
    user_approvedBy: one(schema_1.users, {
        fields: [schema_1.bookings.approvedBy],
        references: [schema_1.users.id],
        relationName: "bookings_approvedBy_users_id"
    }),
    car: one(schema_1.cars, {
        fields: [schema_1.bookings.carId],
        references: [schema_1.cars.id]
    }),
    branch_dropoffBranchId: one(schema_1.branches, {
        fields: [schema_1.bookings.dropoffBranchId],
        references: [schema_1.branches.id],
        relationName: "bookings_dropoffBranchId_branches_id"
    }),
    branch_pickupBranchId: one(schema_1.branches, {
        fields: [schema_1.bookings.pickupBranchId],
        references: [schema_1.branches.id],
        relationName: "bookings_pickupBranchId_branches_id"
    }),
    user_userId: one(schema_1.users, {
        fields: [schema_1.bookings.userId],
        references: [schema_1.users.id],
        relationName: "bookings_userId_users_id"
    }),
    bookingAddons: many(schema_1.bookingAddons),
    payments: many(schema_1.payments),
    handovers: many(schema_1.handovers),
}));
exports.bookingAddonsRelations = (0, relations_1.relations)(schema_1.bookingAddons, ({ one }) => ({
    carAddon: one(schema_1.carAddons, {
        fields: [schema_1.bookingAddons.addonId],
        references: [schema_1.carAddons.id]
    }),
    booking: one(schema_1.bookings, {
        fields: [schema_1.bookingAddons.bookingId],
        references: [schema_1.bookings.id]
    }),
}));
exports.paymentsRelations = (0, relations_1.relations)(schema_1.payments, ({ one }) => ({
    booking: one(schema_1.bookings, {
        fields: [schema_1.payments.bookingId],
        references: [schema_1.bookings.id]
    }),
}));
exports.handoversRelations = (0, relations_1.relations)(schema_1.handovers, ({ one, many }) => ({
    booking: one(schema_1.bookings, {
        fields: [schema_1.handovers.bookingId],
        references: [schema_1.bookings.id]
    }),
    branch: one(schema_1.branches, {
        fields: [schema_1.handovers.branchId],
        references: [schema_1.branches.id]
    }),
    user: one(schema_1.users, {
        fields: [schema_1.handovers.handledBy],
        references: [schema_1.users.id]
    }),
    handoverPhotos: many(schema_1.handoverPhotos),
}));
exports.handoverPhotosRelations = (0, relations_1.relations)(schema_1.handoverPhotos, ({ one }) => ({
    handover: one(schema_1.handovers, {
        fields: [schema_1.handoverPhotos.handoverId],
        references: [schema_1.handovers.id]
    }),
}));
