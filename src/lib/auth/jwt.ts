import { SignJWT, jwtVerify } from "jose";

import { getValidatedAuthConfig } from "@/lib/config";

export type AuthTokenPayload = {
  userId: string;
  email: string;
};

function createSecret(secret: string) {
  return new TextEncoder().encode(secret);
}

async function signToken(
  payload: AuthTokenPayload,
  secret: string,
  expiresIn: string,
) {
  // JWT 是一段被签名的字符串，后端能验证它是否被篡改。
  // 这里 payload 只放 userId 和 email，不放密码、密钥等敏感信息。
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(createSecret(secret));
}

async function verifyToken(token: string, secret: string) {
  try {
    const { payload } = await jwtVerify(token, createSecret(secret));
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    const email = typeof payload.email === "string" ? payload.email : "";

    if (!userId || !email) {
      return null;
    }

    return { userId, email };
  } catch {
    // token 过期、签名错误、被篡改时都返回 null，让调用方统一按未登录处理。
    return null;
  }
}

export async function signAccessToken(payload: AuthTokenPayload) {
  const config = getValidatedAuthConfig();
  // Access Token 有效期短，用来访问业务接口。
  return signToken(payload, config.jwtAccessSecret, config.accessTokenExpiresIn);
}

export async function signRefreshToken(payload: AuthTokenPayload) {
  const config = getValidatedAuthConfig();
  // Refresh Token 有效期长，只用于续签新的 Access Token，不直接访问业务数据。
  return signToken(
    payload,
    config.jwtRefreshSecret,
    config.refreshTokenExpiresIn,
  );
}

export async function verifyAccessToken(token: string) {
  const config = getValidatedAuthConfig();
  return verifyToken(token, config.jwtAccessSecret);
}

export async function verifyRefreshToken(token: string) {
  const config = getValidatedAuthConfig();
  return verifyToken(token, config.jwtRefreshSecret);
}
