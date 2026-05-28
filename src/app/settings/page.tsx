import { AppShell } from "@/components/layout/AppShell";

// 设置页当前只做静态占位，真实密钥保存和连通性测试留到后续阶段。
const modelCards = [
  {
    title: "大语言模型配置",
    status: "P2 阶段暂不连接真实模型",
    fields: ["接口地址占位", "模型名称占位", "密钥占位"],
  },
  {
    title: "向量模型配置",
    status: "P2 阶段暂不连接真实模型",
    fields: ["接口地址占位", "模型名称占位", "密钥占位"],
  },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm font-medium text-slate-500">设置</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            模型配置
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            这里是后续模型配置页面的静态占位。P2 不保存密钥、不测试连接，也不调用任何外部服务。
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {modelCards.map((card) => (
            <section
              key={card.title}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    {card.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{card.status}</p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  占位
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {card.fields.map((field) => (
                  // readOnly 表示当前只是展示壳子，不在前端保存任何密钥。
                  <label key={field} className="block">
                    <span className="text-sm font-medium text-slate-700">
                      {field}
                    </span>
                    <input
                      value=""
                      readOnly
                      placeholder="后续阶段再实现"
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 outline-none"
                    />
                  </label>
                ))}
              </div>

              <button
                type="button"
                className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
              >
                连接测试占位
              </button>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
