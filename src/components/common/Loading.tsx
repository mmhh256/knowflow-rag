type LoadingProps = {
  // label 允许不同页面复用同一个 loading 样式，但展示不同文案。
  label?: string;
};

// 三个小圆点用 Tailwind 动画模拟“正在生成”的状态。
export function Loading({ label = "正在生成模拟回复" }: LoadingProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
      <div className="flex gap-1" aria-hidden="true">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
      </div>
      <span>{label}</span>
    </div>
  );
}
