import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "未登录或登录已过期。" }, { status: 401 });
  }

  return Response.json({ user });
}
