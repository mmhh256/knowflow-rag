import { useState } from "react";

import type { SourceChunk } from "@/components/chat/types";

type SourcePanelProps = {
  sources: SourceChunk[];
};

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (sources.length === 0) {
    return null;
  }

  function toggleSource(sourceId: string) {
    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(sourceId)) {
        nextIds.delete(sourceId);
      } else {
        nextIds.add(sourceId);
      }

      return nextIds;
    });
  }

  return (
    <div className="mt-4 rounded-lg bg-slate-100 px-4 py-3">
      <div className="text-xs font-semibold text-slate-500">引用来源</div>
      <div className="mt-2 space-y-2">
        {sources.map((source) => {
          const isExpanded = expandedIds.has(source.id);

          return (
            <div
              key={source.id}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
            >
              <button
                type="button"
                onClick={() => toggleSource(source.id)}
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <span>
                  <span className="font-medium text-slate-800">
                    {source.fileName}
                  </span>
                  <span className="ml-2 text-slate-400">
                    chunk {source.chunkIndex ?? "-"}
                  </span>
                </span>
                <span className="shrink-0 text-slate-400">
                  {formatScore(source.score)} 相关
                </span>
              </button>
              <p
                className={`mt-2 leading-5 ${
                  isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
                }`}
              >
                {source.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
