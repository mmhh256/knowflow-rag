type AppConfig = {
  llm: {
    provider: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  embedding: {
    provider: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  rag: {
    topK: number;
    scoreThreshold: number;
    chunkSize: number;
    chunkOverlap: number;
  };
  database: {
    url?: string;
  };
  file: {
    uploadDir: string;
  };
  vector: {
    lanceDbPath: string;
  };
  security: {
    configEncryptionSecret?: string;
    jwtAccessSecret?: string;
    jwtRefreshSecret?: string;
  };
};

export type ServerLlmConfig = {
  llmProvider: string;
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
};

const supportedLlmProviders = ["openai-compatible", "deepseek"];

// 空字符串不算有效配置，统一转成 undefined，后续判断会更稳定。
function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

// 数字型环境变量统一在这里解析，写错时使用 fallback，避免 NaN 进入业务逻辑。
function numberEnv(name: string, fallback: number): number {
  const value = optionalEnv(name);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// 所有环境变量集中从 appConfig 读取，避免在组件或接口里到处写 process.env。
export const appConfig: AppConfig = {
  llm: {
    provider: optionalEnv("LLM_PROVIDER") ?? "openai-compatible",
    apiKey: optionalEnv("LLM_API_KEY"),
    baseUrl: optionalEnv("LLM_BASE_URL"),
    model: optionalEnv("LLM_MODEL"),
  },
  embedding: {
    provider: optionalEnv("EMBEDDING_PROVIDER") ?? "openai-compatible",
    apiKey: optionalEnv("EMBEDDING_API_KEY"),
    baseUrl: optionalEnv("EMBEDDING_BASE_URL"),
    model: optionalEnv("EMBEDDING_MODEL"),
  },
  rag: {
    topK: numberEnv("RAG_TOP_K", 5),
    scoreThreshold: numberEnv("RAG_SCORE_THRESHOLD", 0.72),
    chunkSize: numberEnv("RAG_CHUNK_SIZE", 800),
    chunkOverlap: numberEnv("RAG_CHUNK_OVERLAP", 100),
  },
  database: {
    url: optionalEnv("DATABASE_URL"),
  },
  file: {
    uploadDir: optionalEnv("UPLOAD_DIR") ?? "./uploads",
  },
  vector: {
    lanceDbPath: optionalEnv("LANCEDB_PATH") ?? "./data/lancedb",
  },
  security: {
    configEncryptionSecret: optionalEnv("CONFIG_ENCRYPTION_SECRET"),
    jwtAccessSecret: optionalEnv("JWT_ACCESS_SECRET"),
    jwtRefreshSecret: optionalEnv("JWT_REFRESH_SECRET"),
  },
};

// P3 新增：服务端模型配置集中出口。
// 这些值只能在 Route Handler、Provider 等后端代码里使用，不能传给浏览器。
// 尤其是 LLM_API_KEY，如果写进前端组件，用户可以在浏览器源码或 Network 中看到密钥。
export const serverConfig: ServerLlmConfig = {
  llmProvider: appConfig.llm.provider,
  llmApiKey: appConfig.llm.apiKey ?? "",
  llmBaseUrl: appConfig.llm.baseUrl ?? "",
  llmModel: appConfig.llm.model ?? "",
};

// 在真正调用外部模型前做校验，让接口返回“缺了什么”，而不是报一个难懂的 fetch 错误。
export function getValidatedServerLlmConfig(): ServerLlmConfig {
  const missingFields: string[] = [];

  if (!serverConfig.llmApiKey) {
    missingFields.push("LLM_API_KEY");
  }

  if (!serverConfig.llmBaseUrl) {
    missingFields.push("LLM_BASE_URL");
  }

  if (!serverConfig.llmModel) {
    missingFields.push("LLM_MODEL");
  }

  if (missingFields.length > 0) {
    throw new Error(
      `模型配置缺失：${missingFields.join("、")}。请在项目根目录创建 .env.local，填写真实模型配置后重启开发服务器。`,
    );
  }

  if (!supportedLlmProviders.includes(serverConfig.llmProvider)) {
    throw new Error(`暂不支持的模型供应商：${serverConfig.llmProvider}`);
  }

  return serverConfig;
}
