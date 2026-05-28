import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

// 首页只做项目入口和能力说明，不承载聊天状态。
export default function Home() {
  return (
    <AppShell>
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            P2 前后端链路
          </p>
          <h1 className="text-4xl font-semibold text-slate-950 sm:text-5xl">
            面向文档问答的智能知识库系统
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            这是一个按阶段开发的智能知识库问答项目。本阶段已经打通聊天页到后端假接口的请求链路，暂不接入真实 AI、数据库和 RAG。
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/chat"
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              进入智能问答
            </Link>
            <Link
              href="/documents"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              查看知识库
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          {/* 这里保留三张能力卡片，帮助用户快速理解当前项目范围。 */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="font-medium text-slate-950">聊天界面</div>
            <p className="mt-2">
              使用受控输入框，请求后端假接口返回模拟回答。
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="font-medium text-slate-950">知识库管理</div>
            <p className="mt-2">
              使用静态文档表格展示状态和操作占位。
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="font-medium text-slate-950">模型设置</div>
            <p className="mt-2">
              只展示配置壳子，不保存密钥，也不测试接口。
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
