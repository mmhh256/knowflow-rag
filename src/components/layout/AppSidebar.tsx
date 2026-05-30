"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  // usePathname 用来判断当前路由，从而给菜单项添加选中样式。
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-4 py-5 lg:flex lg:flex-col">
      <Link href="/" className="block rounded-lg px-3 py-2">
        <div className="text-sm font-semibold text-slate-950">知流知识库</div>
        <div className="mt-1 text-xs text-slate-500">智能知识库问答</div>
      </Link>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          // 首页需要精确匹配，其他页面可以用 startsWith 支持子路由。
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
    </aside>
  );
}
