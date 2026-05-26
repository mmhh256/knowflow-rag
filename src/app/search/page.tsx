import Link from "next/link";
import AnswerPanel from "@/components/AnswerPanel";
import RelatedQuestions from "@/components/RelatedQuestions";
import SourceList from "@/components/SourceList";
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

        {response.answer ? (
          <AnswerPanel answer={response.answer} />
        ) : (
          <p className="mt-8 text-gray-600">暂时没有找到可用回答。</p>
        )}

        <SourceList sources={response.sources} />
        <RelatedQuestions questions={response.relatedQuestions} />

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
