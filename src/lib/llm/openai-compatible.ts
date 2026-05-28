import { getValidatedServerLlmConfig } from "@/lib/config";
import type {
  ChatModelProvider,
  ChatProviderMessage,
} from "@/lib/llm/chat-provider";

type OpenAICompatibleConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
};

type OpenAICompatibleChoice = {
  message?: {
    content?: string;
  };
};

type OpenAICompatibleResponse = {
  choices?: OpenAICompatibleChoice[];
  error?: {
    message?: string;
  };
};

function buildChatCompletionsUrl(baseUrl: string) {
  // 用户通常会在 .env.local 中写 https://api.example.com/v1，
  // 这里统一去掉末尾斜杠，避免拼出 //chat/completions。
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function explainFetchError(error: unknown, baseUrl: string) {
  const cause = error instanceof Error ? error.cause : undefined;
  const causeMessage =
    cause && typeof cause === "object" && "message" in cause
      ? String(cause.message)
      : "";

  return [
    `连接外部模型服务失败：${baseUrl}`,
    "请检查 LLM_BASE_URL 是否正确、网络或代理是否可访问 DeepSeek，并在修改 .env.local 后重启 npm run dev。",
    causeMessage ? `底层错误：${causeMessage}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function readProviderError(response: Response) {
  try {
    const data = (await response.json()) as OpenAICompatibleResponse;
    return data.error?.message ?? `外部模型接口请求失败：${response.status}`;
  } catch {
    return `外部模型接口请求失败：${response.status}`;
  }
}

export class OpenAICompatibleChatProvider implements ChatModelProvider {
  constructor(private readonly config: OpenAICompatibleConfig) {}

  async generate(messages: ChatProviderMessage[]): Promise<string> {
    const url = buildChatCompletionsUrl(this.config.baseUrl);

    // OpenAI-compatible 指“接口路径和请求/响应格式兼容 OpenAI Chat Completions”。
    // 很多模型服务都支持这种格式，所以我们先实现这一种通用适配。
    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // API Key 只在后端请求头里使用，绝不能返回给前端，也不要打印到日志。
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          // model 表示要使用哪个聊天模型，由 .env.local 中的 LLM_MODEL 决定。
          model: this.config.model,
          // messages 是对话上下文数组。P3 只有 system + 当前 user 问题，还不接历史消息。
          messages,
          // temperature 越高回答越发散，越低越稳定。P3 先使用常见的 0.7。
          temperature: 0.7,
        }),
      });
    } catch (error) {
      throw new Error(explainFetchError(error, this.config.baseUrl));
    }

    console.info("LLM request finished", {
      provider: this.config.provider,
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      status: response.status,
    });

    if (!response.ok) {
      throw new Error(await readProviderError(response));
    }

    const data = (await response.json()) as OpenAICompatibleResponse;
    const answer = data.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error("外部模型返回结构异常：没有找到 choices[0].message.content");
    }

    return answer;
  }
}

export function createOpenAICompatibleChatProvider(): ChatModelProvider {
  const config = getValidatedServerLlmConfig();

  // DeepSeek 的 Chat API 兼容 OpenAI Chat Completions 格式。
  // 因此 LLM_PROVIDER=deepseek 时也复用这个 Provider，只需要在 .env.local
  // 中把 LLM_BASE_URL 和 LLM_MODEL 改成 DeepSeek 对应值。
  return new OpenAICompatibleChatProvider({
    apiKey: config.llmApiKey,
    baseUrl: config.llmBaseUrl,
    model: config.llmModel,
    provider: config.llmProvider,
  });
}
