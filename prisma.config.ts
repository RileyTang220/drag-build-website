import { defineConfig } from 'prisma/config'

/**
 * Prisma 7 owns datasource URLs in this file (no longer allowed in
 * schema.prisma — see P1012).
 *
 * Two-URL pattern:
 *
 *   - `datasource.url` here is what `prisma migrate` / `prisma db push` use.
 *     It MUST be a direct connection: pgbouncer transaction-mode poolers
 *     reject the prepared statements and advisory locks migrations need.
 *
 *   - The runtime client in `lib/prisma.ts` is constructed with the
 *     `@prisma/adapter-pg` driver against `DATABASE_URL`, which on Vercel
 *     points at a Transaction Pooler. The two paths are intentionally
 *     decoupled.
 *
 * Resolution order for migrations:
 *   1. DIRECT_URL   — production (separate direct endpoint)
 *   2. DATABASE_URL — local docker (same URL for both, no pooler)
 *   3. localhost    — last-resort dev fallback
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
  },
})
