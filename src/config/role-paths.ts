import type { UserRole } from "../types"

/**
 * Default UI paths after login — mirror these on the Next.js app for redirects.
 * The API returns `defaultPath` on POST /auth/login so the client can navigate once.
 */
export const ROLE_DEFAULT_PATH: Record<UserRole, string> = {
  user: "/customer",
  branch_staff: "/branch",
  super_admin: "/admin",
}
