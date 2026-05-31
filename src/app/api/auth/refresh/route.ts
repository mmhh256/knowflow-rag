import {
  clearAuthCookies,
  getRefreshTokenFromCookies,
  setAccessTokenCookie,
} from "@/lib/auth/cookies";
import { signAccessToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";

export async function POST() {
  const refreshToken = await getRefreshTokenFromCookies();

  if (!refreshToken) {
    await clearAuthCookies();
    return Response.json({ error: "Refresh Token 不存在，请重新登录。" }, { status: 401 });
  }

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    await clearAuthCookies();
    return Response.json({ error: "Refresh Token 已失效，请重新登录。" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    await clearAuthCookies();
    return Response.json({ error: "用户不存在，请重新登录。" }, { status: 401 });
  }

  // refresh 接口只负责续签短期 access_token，不用 refresh_token 直接访问业务数据。
  const accessToken = await signAccessToken({
    userId: user.id,
    email: user.email,
  });
  await setAccessTokenCookie(accessToken);

  return Response.json({ user });
}
