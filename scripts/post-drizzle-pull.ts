/**
 * drizzle-kit pull can emit invalid TS for some defaults and a wrong FK on users.auth_id → auth.users.
 * Run after every `npm run db:pull` to keep src/db/schema.ts consistent with Supabase.
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "..")
const schemaPath = path.join(root, "src", "db", "schema.ts")

let s = fs.readFileSync(schemaPath, "utf8")

// Broken empty-string default from introspection: .default(').notNull()
s = s.replace(/\.default\('\)\.notNull\(\)/g, `.default("").notNull()`)

// Wrong self-FK target for auth_id → should reference auth.users
s = s.replace(
	/\tforeignColumns: \[table\.id\],\s*\n\t\t\tname: "users_auth_id_fkey"/,
	'\tforeignColumns: [usersInAuth.id],\n\t\t\tname: "users_auth_id_fkey"',
)

if (!s.includes("export const usersInAuth")) {
	if (!s.includes("pgSchema")) {
		s = s.replace(/import \{ pgTable,/, "import { pgTable, pgSchema,")
	}
	const anchor =
		'export const userStatus = pgEnum("user_status", [\'active\', \'suspended\'])\n\n'
	if (!s.includes(anchor)) {
		console.error("post-drizzle-pull: could not find userStatus enum anchor in schema.ts")
		process.exit(1)
	}
	const injected = `${anchor}const authSchema = pgSchema("auth")\n\nexport const usersInAuth = authSchema.table("users", {\n\tid: uuid("id").primaryKey().notNull(),\n})\n\n`
	s = s.replace(anchor, injected)
}

fs.writeFileSync(schemaPath, s, "utf8")
console.log("post-drizzle-pull: updated src/db/schema.ts")
