import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // 单独封装 MarkdownRenderer，方便统一样式和复用：
  // assistant 消息和 Markdown 文档预览都能使用同一套渲染规则。
  return (
    <div className="space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-sm leading-6 text-slate-700">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="mt-3 text-xl font-semibold text-slate-900">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 text-lg font-semibold text-slate-900">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-2 text-base font-semibold text-slate-900">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-6">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-200 bg-slate-50 py-2 pl-4 text-sm text-slate-600">
              {children}
            </blockquote>
          ),
          code: ({ inline, children }) =>
            inline ? (
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-800">
                {children}
              </code>
            ) : (
              <code className="text-xs text-slate-100">{children}</code>
            ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-slate-200 bg-slate-100 px-3 py-2 text-left text-xs font-semibold text-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-3 py-2 text-xs text-slate-700">
              {children}
            </td>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sky-600 underline underline-offset-2 hover:text-sky-700"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
