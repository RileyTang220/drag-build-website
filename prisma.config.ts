import "dotenv/config";
import { defineConfig } from "prisma/config";

// prisma generate 不会连库，但 Prisma 7 仍会解析该字段；Vercel/Docker 构建阶段若未注入
// DATABASE_URL 会报错，故用占位串；运行时请务必配置真实 DATABASE_URL。
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
