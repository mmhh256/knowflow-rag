import { clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";

type LoginBody = {
  email?: string;
  password?: string;
};

function toUserDto(user: { id: string; email: string; name: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return Response.json({ error: "邮箱和密码不能为空。" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "邮箱或密码错误。" }, { status: 401 });
    }

    const payload = { userId: user.id, email: user.email };
    await setAuthCookies({
      accessToken: await signAccessToken(payload),
      refreshToken: await signRefreshToken(payload),
    });

    return Response.json({ user: toUserDto(user) });
  } catch (error) {
    await clearAuthCookies();
    // 登录失败时也不要把数据库或 JWT 的内部错误直接返回给前端。
    console.error("登录失败", error);
    return Response.json(
      { error: "登录失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
