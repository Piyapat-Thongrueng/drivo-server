const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
]

/** Comma-separated origins, e.g. https://drivo-gamma.vercel.app,http://localhost:3000 */
export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim()
  if (!raw) {
    return DEFAULT_DEV_ORIGINS
  }
  return raw.split(",").map((o) => o.trim()).filter(Boolean)
}
