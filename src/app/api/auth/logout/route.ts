import { clearAuthCookies } from "@/lib/auth/cookies";

export async function POST() {
  // P11 第一版通过清除 Cookie 完成退出登录，不做 refresh token 黑名单和多设备下线。
  await clearAuthCookies();
  return Response.json({ success: true });
}
