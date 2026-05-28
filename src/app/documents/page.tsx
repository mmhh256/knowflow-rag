import { AppShell } from "@/components/layout/AppShell";

// P2 仍然只展示静态文档数据，不做真实上传、解析或索引。
const documents = [
  {
    name: "产品需求说明.pdf",
    type: "便携文档",
    size: "1.8 MB",
    uploadedAt: "2026-05-28",
    parseStatus: "已解析",
    indexStatus: "已索引",
    chunks: 42,
  },
  {
    name: "客服知识手册.md",
    type: "标记文档",
    size: "86 KB",
    uploadedAt: "2026-05-27",
    parseStatus: "已上传",
    indexStatus: "待索引",
    chunks: 0,
  },
];

export default function DocumentsPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">知识库</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              文档管理
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              这里是知识库管理页的静态壳子。真实上传、解析、索引和删除功能会在后续阶段实现。
            </p>
          </div>
          <button
            type="button"
            className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"
          >
            上传文档占位
          </button>
        </div>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">
              文档列表
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              这里用模拟数据展示后续知识库问答可用性需要关注的字段。
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">文档名称</th>
                  <th className="px-5 py-3">类型</th>
                  <th className="px-5 py-3">大小</th>
                  <th className="px-5 py-3">上传时间</th>
                  <th className="px-5 py-3">解析状态</th>
                  <th className="px-5 py-3">索引状态</th>
                  <th className="px-5 py-3">分块数</th>
                  <th className="px-5 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((document) => (
                  // 文档名在模拟数据中唯一，暂时可作为 key；接数据库后应改用 documentId。
                  <tr key={document.name} className="text-slate-700">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
                      {document.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {document.type}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {document.size}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {document.uploadedAt}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {document.parseStatus}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {document.indexStatus}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {document.chunks}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex gap-2">
                        <button className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">
                          预览
                        </button>
                        <button className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">
                          重新索引
                        </button>
                        <button className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
