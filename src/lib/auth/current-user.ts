import { prisma } from "@/lib/db";
import { getAccessTokenFromCookies } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/jwt";

export class UnauthorizedError extends Error {
  constructor(message = "请先登录后再访问。") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export type CurrentUser = {
  id: string;
  email: string;
  name?: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return null;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  // 后端接口不能相信前端传来的 userId。真正的当前用户必须来自服务端验证过的 token。
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true },
  });

  return user;
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof UnauthorizedError;
}
