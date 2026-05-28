"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/chat", label: "智能问答" },
  { href: "/documents", label: "知识库" },
  { href: "/settings", label: "模型设置" },
];

// P2 仍然使用静态会话，后续保存会话后再从后端读取。
const conversations = [
  { title: "产品问答", time: "刚刚" },
  { title: "文档理解", time: "昨天" },
  { title: "模型配置", time: "草稿" },
];

export function AppSidebar() {
  // usePathname 用来判断当前路由，从而给菜单项添加选中样式。
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:flex lg:flex-col">
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

      <section className="mt-8 border-t border-slate-200 pt-5">
        <div className="px-3 text-xs font-semibold text-slate-500">
          会话列表
        </div>
        <div className="mt-3 space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.title}
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <span className="block truncate font-medium">
                {conversation.title}
              </span>
              <span className="mt-1 block text-xs text-slate-400">
                {conversation.time}
              </span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
