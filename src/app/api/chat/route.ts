import type {
  ChatErrorResponse,
  ChatRequest,
  ChatResponse,
} from "@/lib/types/chat";

// 统一生成错误响应，避免每个分支都手写一遍 Response.json。
function jsonError(message: string, status: number) {
  const body: ChatErrorResponse = { error: message };
  return Response.json(body, { status });
}

// Next.js App Router 会把 POST /api/chat 路由到这个函数。
export async function POST(req: Request) {
  try {
    // P2 只读取 question，不读取 API Key、不访问数据库、不做 RAG。
    const body = (await req.json()) as Partial<ChatRequest>;
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return jsonError("问题不能为空", 400);
    }

    const response: ChatResponse = {
      answer: `这是一个模拟回答：你问的是 ${question}`,
      // sources 先保留为空数组，后续 RAG 阶段会放入真实引用片段。
      sources: [],
    };

    return Response.json(response);
  } catch (error) {
    // 这里兜住 JSON 解析失败等异常，保证前端能收到统一错误结构。
    console.error("Mock chat route failed:", error);
    return jsonError("聊天接口处理失败", 500);
  }
}
