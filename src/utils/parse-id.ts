import { createError } from "./error"

/** Normalize Express route param (may be string | string[]). */
function normalizeRouteParam(
  raw: string | string[] | undefined,
  label: string,
): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== "string") {
    throw createError(`Invalid ${label}`, 400)
  }
  return value
}

/** Parse :id route param — rejects NaN, undefined, zero. */
export function parsePositiveIntParam(
  raw: string | string[] | undefined,
  label = "id",
): number {
  const idStr = normalizeRouteParam(raw, label)
  if (idStr === "undefined" || idStr === "null" || idStr.trim() === "") {
    throw createError(`Invalid ${label}`, 400)
  }
  const id = Number(idStr)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError(`Invalid ${label}`, 400)
  }
  return id
}
