type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

export default async function Search({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  const query = Array.isArray(params.q)
    ? params.q[0]
    : params.q;

  return (
    <div>
      <h1>搜索结果页</h1>
      <p>当前问题：{query ?? "未提供"}</p>
    </div>
  );
}