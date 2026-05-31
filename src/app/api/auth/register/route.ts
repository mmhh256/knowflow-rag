import { clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";

type RegisterBody = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toUserDto(user: { id: string; email: string; name: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const confirmPassword = body.confirmPassword ?? "";
    const name = body.name?.trim() || null;

    if (!isEmail(email)) {
      return Response.json({ error: "请输入正确的邮箱地址。" }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "密码至少需要 6 位。" }, { status: 400 });
    }

    if (confirmPassword && password !== confirmPassword) {
      return Response.json({ error: "两次输入的密码不一致。" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return Response.json({ error: "该邮箱已经注册。" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true },
    });

    // 注册成功后自动登录：签发双 token，但只写入 httpOnly Cookie，不把 token 明文返回给前端。
    const payload = { userId: user.id, email: user.email };
    await setAuthCookies({
      accessToken: await signAccessToken(payload),
      refreshToken: await signRefreshToken(payload),
    });

    return Response.json({ user: toUserDto(user) });
  } catch (error) {
    await clearAuthCookies();
    // 注册接口不能把 Prisma 内部错误、SQL 信息或 passwordHash 泄露给浏览器。
    // 真实项目里可以把 error 写入后端日志；前端只需要看到可理解、可操作的提示。
    console.error("注册失败", error);
    return Response.json(
      { error: "注册失败，请确认数据库迁移已执行，并稍后重试。" },
      { status: 500 },
    );
  }
}
