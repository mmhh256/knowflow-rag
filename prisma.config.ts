import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig, env } from "prisma/config";

// Prisma CLI 加载 prisma.config.ts 时，不一定会自动读取 Next.js 的 .env.local。
// 这里主动加载 .env 和 .env.local，让 prisma generate / migrate 能拿到 DATABASE_URL。
if (existsSync(".env")) {
  loadEnvFile(".env");
}

if (existsSync(".env.local")) {
  loadEnvFile(".env.local");
}

// Prisma 7 开始，数据库连接地址不再写在 schema.prisma 里。
// migrate / introspect 等 CLI 命令会从这里读取 DATABASE_URL。
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
