import { createError } from "./error"

/** Parse :id route param — rejects NaN, undefined, zero. */
export function parsePositiveIntParam(raw: string, label = "id"): number {
  if (raw === "undefined" || raw === "null" || raw.trim() === "") {
    throw createError(`Invalid ${label}`, 400)
  }
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError(`Invalid ${label}`, 400)
  }
  return id
}
