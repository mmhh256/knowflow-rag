"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/chat", label: "智能问答" },
  { href: "/documents", label: "知识库" },
  { href: "/settings", label: "模型设置" },
];

type AppSidebarProps = {
  children?: React.ReactNode;
};

export function AppSidebar({ children }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <aside className="hidden h-full w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-4 py-5 lg:flex lg:flex-col">
      <Link href="/" className="block rounded-lg px-3 py-2">
        <div className="text-sm font-semibold text-slate-950">知流知识库</div>
        <div className="mt-1 text-xs text-slate-500">智能知识库问答</div>
      </Link>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children ? (
        <section className="mt-8 min-h-0 border-t border-slate-200 pt-5">
          {children}
        </section>
      ) : null}

      <div className="mt-auto border-t border-slate-200 pt-4">
        {user ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">当前用户</div>
              <div className="mt-1 truncate text-sm font-medium text-slate-900">
                {user.name || user.email}
              </div>
              {user.name ? (
                <div className="mt-1 truncate text-xs text-slate-500">
                  {user.email}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            >
              退出登录
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white"
          >
            登录
          </Link>
        )}
      </div>
    </aside>
  );
}
