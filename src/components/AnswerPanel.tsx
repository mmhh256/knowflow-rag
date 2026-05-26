import type { SearchAnswer } from "@/types/search";

type AnswerPanelProps = {
  answer: SearchAnswer;
};

const confidenceText: Record<SearchAnswer["confidence"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export default function AnswerPanel({ answer }: AnswerPanelProps) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">回答摘要</h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          置信度：{confidenceText[answer.confidence]}
        </span>
      </div>

      <p className="mt-3 leading-7 text-gray-700">{answer.summary}</p>

      <p className="mt-4 text-sm leading-6 text-gray-500">
        该回答根据下方引用来源整理生成，请结合来源内容判断是否适用于你的具体情况。
      </p>
    </section>
  );
}
