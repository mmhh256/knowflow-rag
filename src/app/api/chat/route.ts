import type {
  ChatErrorResponse,
  ChatRequest,
  ChatResponse,
} from "@/lib/types/chat";
import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import type { ChatProviderMessage } from "@/lib/llm/chat-provider";

const SYSTEM_PROMPT =
  "你是一个专业、清晰、耐心的 AI 助手。请用中文回答用户问题，回答尽量结构清晰。";

// 统一生成错误响应，避免每个分支都手写一遍 Response.json。
function jsonError(message: string, status: number) {
  const body: ChatErrorResponse = { error: message };
  return Response.json(body, { status });
}

// Route Handler 就是 Next.js App Router 里的后端接口。
// 浏览器请求 POST /api/chat 时，Next.js 会执行这个 POST 函数。
export async function POST(req: Request) {
  try {
    // req.json() 会把请求体里的 JSON 字符串解析成对象。
    // P3 只读取 question，不读取数据库、不做 RAG、不保存消息。
    const body = (await req.json()) as Partial<ChatRequest>;
    const question = typeof body.question === "string" ? body.question.trim() : "";

    // 空问题没有调用模型的意义，也会浪费外部 API 额度，所以先在后端拦住。
    if (!question) {
      return jsonError("问题不能为空", 400);
    }

    const messages: ChatProviderMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question },
    ];

    const chatProvider = createOpenAICompatibleChatProvider();
    const answer = await chatProvider.generate(messages);

    const response: ChatResponse = {
      answer,
      // 返回结构继续保留 sources，是为了让前端和后续 RAG 阶段的数据结构保持稳定。
      // P3 只是普通 AI 对话，还没有知识库检索，所以这里仍然是空数组。
      sources: [],
    };

    return Response.json(response);
  } catch (error) {
    // 这里兜住环境变量缺失、外部 API 报错、响应结构异常等问题。
    // 注意不要在日志中打印 API Key。
    console.error("Chat route failed:", error);
    const message = error instanceof Error ? error.message : "聊天接口处理失败";
    return jsonError(message, 500);
  }
}
