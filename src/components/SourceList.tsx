import type { SearchSource } from "@/types/search";
import SourceCard from "@/components/SourceCard";

type SourceListProps = {
  sources: SearchSource[];
};

export default function SourceList({ sources }: SourceListProps) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">引用来源</h2>

      <ol className="mt-3 space-y-4">
        {sources.map((source, index) => (
          <SourceCard key={source.id} source={source} index={index} />
        ))}
      </ol>
    </section>
  );
}
