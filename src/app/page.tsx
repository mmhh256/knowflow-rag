import SearchBox from "@/components/SearchBox";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <section className="w-full max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium text-blue-600">
          Campus RAG Learning
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          校园智能问答平台
        </h1>

        <p className="mt-4 text-gray-600">
          输入你想了解的校园问题，例如图书馆借书、奖学金申请、教务流程等。
        </p>

        <div className="mt-8 flex justify-center">
          <SearchBox />
        </div>
      </section>
    </main>
  );
}
