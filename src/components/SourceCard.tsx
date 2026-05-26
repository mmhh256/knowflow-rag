import type { SearchSource } from "@/types/search";

type SourceCardProps = {
  source: SearchSource;
  index: number;
};

const sourceTypeText: Record<SearchSource["type"], string> = {
  official: "官方",
  student_experience: "社区",
  faq: "FAQ",
};

export default function SourceCard({ source, index }: SourceCardProps) {
  return (
    <li className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-gray-900">
          {index + 1}. {source.title}
        </p>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
          {sourceTypeText[source.type]}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-500">来源站点：{source.site}</p>

      <p className="mt-3 text-sm leading-6 text-gray-600">{source.excerpt}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {source.highlights.map((keyword) => (
          <span
            key={keyword}
            className="rounded-full bg-yellow-50 px-2 py-1 text-xs text-yellow-800"
          >
            {keyword}
          </span>
        ))}
      </div>
    </li>
  );
}
