import Link from "next/link";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  const question = Array.isArray(params.q) ? params.q[0] : params.q;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <section className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-blue-600">搜索结果页</p>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          当前问题：{question || "未提供"}
        </h1>

        <p className="mt-4 text-gray-600">
          P1 阶段只负责从 URL 中读取问题，还不会请求接口，也不会生成 RAG 答案。
        </p>

        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-gray-900 px-5 py-3 text-white"
        >
          返回首页
        </Link>
      </section>
    </main>
  );
}
