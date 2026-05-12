import { relations } from "drizzle-orm/relations";
import { branches, users, usersInAuth, countries, oneWayFees, cars, carAddons, bookings, bookingAddons, payments, handovers, handoverPhotos } from "./schema";

export const usersRelations = relations(users, ({one, many}) => ({
	branch: one(branches, {
		fields: [users.branchId],
		references: [branches.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [users.authId],
		references: [usersInAuth.id]
	}),
	bookings_approvedBy: many(bookings, {
		relationName: "bookings_approvedBy_users_id"
	}),
	bookings_userId: many(bookings, {
		relationName: "bookings_userId_users_id"
	}),
	handovers: many(handovers),
}));

export const branchesRelations = relations(branches, ({one, many}) => ({
	users: many(users),
	country: one(countries, {
		fields: [branches.countryId],
		references: [countries.id]
	}),
	oneWayFees_fromBranchId: many(oneWayFees, {
		relationName: "oneWayFees_fromBranchId_branches_id"
	}),
	oneWayFees_toBranchId: many(oneWayFees, {
		relationName: "oneWayFees_toBranchId_branches_id"
	}),
	cars_branchId: many(cars, {
		relationName: "cars_branchId_branches_id"
	}),
	cars_currentBranchId: many(cars, {
		relationName: "cars_currentBranchId_branches_id"
	}),
	bookings_dropoffBranchId: many(bookings, {
		relationName: "bookings_dropoffBranchId_branches_id"
	}),
	bookings_pickupBranchId: many(bookings, {
		relationName: "bookings_pickupBranchId_branches_id"
	}),
	handovers: many(handovers),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	users: many(users),
}));

export const countriesRelations = relations(countries, ({many}) => ({
	branches: many(branches),
}));

export const oneWayFeesRelations = relations(oneWayFees, ({one}) => ({
	branch_fromBranchId: one(branches, {
		fields: [oneWayFees.fromBranchId],
		references: [branches.id],
		relationName: "oneWayFees_fromBranchId_branches_id"
	}),
	branch_toBranchId: one(branches, {
		fields: [oneWayFees.toBranchId],
		references: [branches.id],
		relationName: "oneWayFees_toBranchId_branches_id"
	}),
}));

export const carsRelations = relations(cars, ({one, many}) => ({
	branch_branchId: one(branches, {
		fields: [cars.branchId],
		references: [branches.id],
		relationName: "cars_branchId_branches_id"
	}),
	branch_currentBranchId: one(branches, {
		fields: [cars.currentBranchId],
		references: [branches.id],
		relationName: "cars_currentBranchId_branches_id"
	}),
	carAddons: many(carAddons),
	bookings: many(bookings),
}));

export const carAddonsRelations = relations(carAddons, ({one, many}) => ({
	car: one(cars, {
		fields: [carAddons.carId],
		references: [cars.id]
	}),
	bookingAddons: many(bookingAddons),
}));

export const bookingsRelations = relations(bookings, ({one, many}) => ({
	user_approvedBy: one(users, {
		fields: [bookings.approvedBy],
		references: [users.id],
		relationName: "bookings_approvedBy_users_id"
	}),
	car: one(cars, {
		fields: [bookings.carId],
		references: [cars.id]
	}),
	branch_dropoffBranchId: one(branches, {
		fields: [bookings.dropoffBranchId],
		references: [branches.id],
		relationName: "bookings_dropoffBranchId_branches_id"
	}),
	branch_pickupBranchId: one(branches, {
		fields: [bookings.pickupBranchId],
		references: [branches.id],
		relationName: "bookings_pickupBranchId_branches_id"
	}),
	user_userId: one(users, {
		fields: [bookings.userId],
		references: [users.id],
		relationName: "bookings_userId_users_id"
	}),
	bookingAddons: many(bookingAddons),
	payments: many(payments),
	handovers: many(handovers),
}));

export const bookingAddonsRelations = relations(bookingAddons, ({one}) => ({
	carAddon: one(carAddons, {
		fields: [bookingAddons.addonId],
		references: [carAddons.id]
	}),
	booking: one(bookings, {
		fields: [bookingAddons.bookingId],
		references: [bookings.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	booking: one(bookings, {
		fields: [payments.bookingId],
		references: [bookings.id]
	}),
}));

export const handoversRelations = relations(handovers, ({one, many}) => ({
	booking: one(bookings, {
		fields: [handovers.bookingId],
		references: [bookings.id]
	}),
	branch: one(branches, {
		fields: [handovers.branchId],
		references: [branches.id]
	}),
	user: one(users, {
		fields: [handovers.handledBy],
		references: [users.id]
	}),
	handoverPhotos: many(handoverPhotos),
}));

export const handoverPhotosRelations = relations(handoverPhotos, ({one}) => ({
	handover: one(handovers, {
		fields: [handoverPhotos.handoverId],
		references: [handovers.id]
	}),
}));