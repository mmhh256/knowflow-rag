type EmptyStateProps = {
  title: string;
  description: string;
  // action 用来放按钮或链接，不传时只展示提示文案。
  action?: React.ReactNode;
};

// 通用空状态组件，适合聊天无消息、列表无数据等场景复用。
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
