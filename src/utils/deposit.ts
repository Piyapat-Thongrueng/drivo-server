import { createError } from "./error"

/**
 * Resolve deposit amount from countries.default_deposit_amount.
 * Amount is in the country's currency_code unit (e.g. THB = baht).
 */
export function resolveCountryDepositAmount(
  defaultDepositAmount: string | number | null | undefined,
): number {
  const amount = Number(defaultDepositAmount ?? 0)

  if (Number.isFinite(amount) && amount > 0) {
    return amount
  }

  throw createError(
    "Deposit amount is not configured for this country. Please contact support.",
    409,
  )
}
