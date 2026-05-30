import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const missingDatabaseUrlFallback =
  "mysql://missing:missing@localhost:3306/missing";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getPrismaAdapterUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? missingDatabaseUrlFallback;

  // Prisma migrate 的 provider 是 mysql，所以 .env 里应该写 mysql://。
  // 但 @prisma/adapter-mariadb 底层驱动要求 mariadb:// 连接串。
  // 这里在运行时自动转换，避免 CLI 和运行时代码互相打架。
  return databaseUrl.replace(/^mysql:\/\//, "mariadb://");
}

// Prisma Client 是 TypeScript 访问数据库的对象。
// 在 Next.js 开发环境中，热更新会反复加载模块；如果每次都 new PrismaClient，
// 数据库连接会越来越多，所以这里把实例挂到 globalThis 上做单例复用。
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(getPrismaAdapterUrl()),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 真正读写数据库前调用它，可以给初学者一个清楚的错误提示。
// 否则缺 DATABASE_URL 时，底层数据库驱动会报很难理解的连接错误。
export function assertDatabaseConfigured() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "数据库配置缺失：DATABASE_URL。请在 .env.local 中配置 MySQL 连接地址，执行 Prisma migrate 后重启项目。",
    );
  }
}
