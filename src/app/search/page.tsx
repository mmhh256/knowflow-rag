import Link from "next/link";
import { mockSearchResponse } from "@/mock/searchResponse";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const question = Array.isArray(params.q) ? params.q[0] : params.q;
  const response = mockSearchResponse;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <section className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-blue-600">搜索结果页</p>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          当前问题：{question || "未提供"}
        </h1>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">回答摘要</h2>
          <p className="mt-3 leading-7 text-gray-700">
            {response.answer?.summary || "暂时没有找到可用回答。"}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">引用来源</h2>
          <ol className="mt-3 space-y-4">
            {response.sources.map((source, index) => (
              <li key={source.id} className="rounded-xl border border-gray-200 p-4">
                <p className="font-medium text-gray-900">
                  {index + 1}. {source.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {source.excerpt}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  来源类型：{source.type}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">相关问题</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {response.relatedQuestions.map((relatedQuestion) => (
              <li key={relatedQuestion}>{relatedQuestion}</li>
            ))}
          </ul>
        </section>

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
