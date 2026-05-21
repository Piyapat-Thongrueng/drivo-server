/** รวมยอดเงินแบบ string (numeric จาก DB) */
export function sumAmountStrings(values: string[]): string {
  const total = values.reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
  return total.toFixed(2)
}

/** rental + damage ต่อ currency (deposit ไม่รวมใน total revenue) */
export function computeTotalRevenue(rental: string, damage: string): string {
  return sumAmountStrings([rental, damage])
}

export interface CurrencyAmountMap {
  [currency: string]: string
}

/** รวมยอดจากหลายแถวเข้า map ต่อ currency */
export function mergeAmountsByCurrency(
  rows: Array<{ currency: string; amount: string }>,
): CurrencyAmountMap {
  const map: Record<string, number> = {}
  for (const row of rows) {
    const code = row.currency.trim()
    map[code] = (map[code] ?? 0) + (parseFloat(row.amount) || 0)
  }
  const result: CurrencyAmountMap = {}
  for (const [currency, value] of Object.entries(map)) {
    result[currency] = value.toFixed(2)
  }
  return result
}

/** รวมค่าเข้า map ที่มีอยู่แล้ว */
export function addToCurrencyMap(
  map: CurrencyAmountMap,
  currency: string,
  amount: string,
): void {
  const code = currency.trim()
  const prev = parseFloat(map[code] ?? "0") || 0
  const next = prev + (parseFloat(amount) || 0)
  map[code] = next.toFixed(2)
}

export interface DailyRevenuePoint {
  day: string
  currency: string
  rental: string
  damage: string
}

/** สร้าง series รายวันจาก bucket rows + รายการวันที่ต้องมีครบ */
export function buildDailySeries(
  days: string[],
  points: DailyRevenuePoint[],
  currencyFilter?: string,
): Array<{ currency: string; points: number[] }> {
  const currencies = currencyFilter
    ? [currencyFilter]
    : [...new Set(points.map((p) => p.currency))].sort()

  return currencies.map((currency) => {
    const byDay = new Map<string, number>()
    for (const p of points) {
      if (p.currency !== currency) continue
      const total =
        (parseFloat(p.rental) || 0) + (parseFloat(p.damage) || 0)
      byDay.set(p.day, (byDay.get(p.day) ?? 0) + total)
    }
    return {
      currency,
      points: days.map((d) => byDay.get(d) ?? 0),
    }
  })
}
