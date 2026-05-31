import { cookies } from "next/headers";

import { appConfig } from "@/lib/config";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

function parseMaxAgeSeconds(value: string, fallbackSeconds: number) {
  const match = value.trim().match(/^(\d+)([smhd])?$/);
  if (!match) {
    return fallbackSeconds;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? "s";
  const factor = unit === "m" ? 60 : unit === "h" ? 3600 : unit === "d" ? 86400 : 1;
  return amount * factor;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function setAuthCookies(params: {
  accessToken: string;
  refreshToken: string;
}) {
  await setAccessTokenCookie(params.accessToken);

  const cookieStore = await cookies();
  cookieStore.set(
    REFRESH_TOKEN_COOKIE,
    params.refreshToken,
    cookieOptions(
      parseMaxAgeSeconds(appConfig.security.refreshTokenExpiresIn, 7 * 86400),
    ),
  );
}

export async function setAccessTokenCookie(accessToken: string) {
  const cookieStore = await cookies();
  // httpOnly Cookie 只能由服务端读写，前端 JS 不能直接读取，比 localStorage 更适合保存 token。
  cookieStore.set(
    ACCESS_TOKEN_COOKIE,
    accessToken,
    cookieOptions(
      parseMaxAgeSeconds(appConfig.security.accessTokenExpiresIn, 15 * 60),
    ),
  );
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getAccessTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
}
