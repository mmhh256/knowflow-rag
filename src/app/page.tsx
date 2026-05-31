import { redirect } from "next/navigation";

// 项目不再保留单独首页，访问根路径时直接进入核心问答页面。
// 页面保护仍然由 /chat 内部的 AppShell + AuthGuard 负责处理。
export default function Home() {
  redirect("/chat");
}
