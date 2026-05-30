import type {
  ChatErrorResponse,
  ChatRequest,
  ChatResponse,
} from "@/lib/types/chat";
import { createOpenAICompatibleChatProvider } from "@/lib/llm/openai-compatible";
import type { ChatProviderMessage } from "@/lib/llm/chat-provider";
import { ensureMockUser, MOCK_USER_ID } from "@/lib/auth/mock-user";
import { prisma } from "@/lib/db";

const SYSTEM_PROMPT =
  "你是一个专业、清晰、耐心的 AI 助手。请用中文回答用户问题，回答尽量结构清晰。";
const FALLBACK_REASON = "当前阶段尚未接入知识库检索，使用普通大模型回答。";

// 统一生成错误响应，避免每个分支都手写一遍 Response.json。
function jsonError(message: string, status: number) {
  const body: ChatErrorResponse = { error: message };
  return Response.json(body, { status });
}

function createConversationTitle(question: string) {
  return question.length > 20 ? `${question.slice(0, 20)}...` : question;
}

async function getOrCreateConversation(
  conversationId: string | undefined,
  question: string,
) {
  await ensureMockUser();

  if (!conversationId) {
    // 第一次发送消息时前端可能还没有会话 id。
    // 这里自动创建会话，让用户不用先点“新建会话”也能开始聊天。
    return prisma.conversation.create({
      data: {
        userId: MOCK_USER_ID,
        title: createConversationTitle(question),
      },
    });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId: MOCK_USER_ID,
    },
  });

  if (!conversation) {
    return null;
  }

  return conversation;
}

// Route Handler 就是 Next.js App Router 里的后端接口。
// 浏览器请求 POST /api/chat 时，Next.js 会执行这个 POST 函数。
export async function POST(req: Request) {
  try {
    // req.json() 会把请求体里的 JSON 字符串解析成对象。
    // P4 读取 question 和可选 conversationId，用于把消息保存到对应会话。
    const body = (await req.json()) as Partial<ChatRequest>;
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId : undefined;

    // 空问题没有调用模型的意义，也会浪费外部 API 额度，所以先在后端拦住。
    if (!question) {
      return jsonError("问题不能为空", 400);
    }

    const conversation = await getOrCreateConversation(conversationId, question);

    if (!conversation) {
      return jsonError("会话不存在", 404);
    }

    // 保存顺序很重要：先保存用户问题，再调用模型，再保存 AI 回复。
    // 即使后续模型调用失败，数据库里也能看到用户刚才问过什么，方便排查。
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: question,
      },
    });

    const messages: ChatProviderMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question },
    ];

    const chatProvider = createOpenAICompatibleChatProvider();
    const answer = await chatProvider.generate(messages);

    const response: ChatResponse = {
      conversationId: conversation.id,
      answer,
      // 返回结构继续保留 sources，是为了让前端和后续 RAG 阶段的数据结构保持稳定。
      // P4 只是普通 AI 对话，还没有知识库检索，所以这里仍然是空数组。
      sources: [],
      // P4 没有做知识库检索，所以所有回答都先标记为 fallback。
      answerMode: "fallback",
      retrievalStatus: "no_documents",
      fallbackReason: FALLBACK_REASON,
    };

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: answer,
        sources: [],
        answerMode: response.answerMode,
        retrievalStatus: response.retrievalStatus,
        fallbackReason: response.fallbackReason,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return Response.json(response);
  } catch (error) {
    // 这里兜住环境变量缺失、外部 API 报错、响应结构异常等问题。
    // 注意不要在日志中打印 API Key。
    console.error("Chat route failed:", error);
    const message = error instanceof Error ? error.message : "聊天接口处理失败";
    return jsonError(message, 500);
  }
}
