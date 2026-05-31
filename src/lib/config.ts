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
  conversation: {
    historyLimit: number;
  };
  database: {
    url?: string;
  };
  file: {
    uploadDir: string;
  };
  vector: {
    lancedbPath: string;
  };
  security: {
    configEncryptionSecret?: string;
    jwtAccessSecret?: string;
    jwtRefreshSecret?: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
  };
};

export type ServerLlmConfig = {
  llmProvider: string;
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
};

export type ServerEmbeddingConfig = {
  embeddingProvider: string;
  embeddingApiKey: string;
  embeddingBaseUrl: string;
  embeddingModel: string;
  lancedbPath: string;
};

export type ServerAuthConfig = {
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
};

const supportedLlmProviders = ["openai-compatible", "deepseek"];
const supportedEmbeddingProviders = ["openai-compatible"];

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function numberEnv(name: string, fallback: number): number {
  const value = optionalEnv(name);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// 所有环境变量集中从 appConfig 读取，避免在接口里到处散落 process.env。
// LLM / Embedding / JWT secret 都只能在服务端使用，不能返回给浏览器。
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
    scoreThreshold: numberEnv("RAG_SCORE_THRESHOLD", 0.35),
    chunkSize: numberEnv("RAG_CHUNK_SIZE", 800),
    chunkOverlap: numberEnv("RAG_CHUNK_OVERLAP", 100),
  },
  conversation: {
    // 多轮对话只读取最近 N 条消息，避免 prompt 过长、成本过高，也减少旧话题干扰当前问题。
    historyLimit: numberEnv("CONVERSATION_HISTORY_LIMIT", 8),
  },
  database: {
    url: optionalEnv("DATABASE_URL"),
  },
  file: {
    uploadDir: optionalEnv("UPLOAD_DIR") ?? "./uploads",
  },
  vector: {
    lancedbPath: optionalEnv("LANCEDB_PATH") ?? "./data/lancedb",
  },
  security: {
    configEncryptionSecret: optionalEnv("CONFIG_ENCRYPTION_SECRET"),
    jwtAccessSecret: optionalEnv("JWT_ACCESS_SECRET"),
    jwtRefreshSecret: optionalEnv("JWT_REFRESH_SECRET"),
    accessTokenExpiresIn: optionalEnv("ACCESS_TOKEN_EXPIRES_IN") ?? "15m",
    refreshTokenExpiresIn: optionalEnv("REFRESH_TOKEN_EXPIRES_IN") ?? "7d",
  },
};

export const serverConfig: ServerLlmConfig = {
  llmProvider: appConfig.llm.provider,
  llmApiKey: appConfig.llm.apiKey ?? "",
  llmBaseUrl: appConfig.llm.baseUrl ?? "",
  llmModel: appConfig.llm.model ?? "",
};

export const serverEmbeddingConfig: ServerEmbeddingConfig = {
  embeddingProvider: appConfig.embedding.provider,
  embeddingApiKey: appConfig.embedding.apiKey ?? "",
  embeddingBaseUrl: appConfig.embedding.baseUrl ?? "",
  embeddingModel: appConfig.embedding.model ?? "",
  lancedbPath: appConfig.vector.lancedbPath,
};

export function getValidatedServerLlmConfig(): ServerLlmConfig {
  const missingFields: string[] = [];

  if (!serverConfig.llmApiKey) missingFields.push("LLM_API_KEY");
  if (!serverConfig.llmBaseUrl) missingFields.push("LLM_BASE_URL");
  if (!serverConfig.llmModel) missingFields.push("LLM_MODEL");

  if (missingFields.length > 0) {
    throw new Error(
      `模型配置缺失：${missingFields.join("、")}。请在 .env.local 中填写真实模型配置后重启 npm run dev。`,
    );
  }

  if (!supportedLlmProviders.includes(serverConfig.llmProvider)) {
    throw new Error(`暂不支持的模型供应商：${serverConfig.llmProvider}`);
  }

  return serverConfig;
}

export function getValidatedServerEmbeddingConfig(): ServerEmbeddingConfig {
  const missingFields: string[] = [];

  if (!serverEmbeddingConfig.embeddingApiKey) {
    missingFields.push("EMBEDDING_API_KEY");
  }
  if (!serverEmbeddingConfig.embeddingBaseUrl) {
    missingFields.push("EMBEDDING_BASE_URL");
  }
  if (!serverEmbeddingConfig.embeddingModel) {
    missingFields.push("EMBEDDING_MODEL");
  }

  if (missingFields.length > 0) {
    throw new Error(
      `Embedding 配置缺失：${missingFields.join("、")}。请在 .env.local 中填写 Embedding 配置后重启 npm run dev。`,
    );
  }

  if (
    !supportedEmbeddingProviders.includes(
      serverEmbeddingConfig.embeddingProvider,
    )
  ) {
    throw new Error(
      `暂不支持的 Embedding 供应商：${serverEmbeddingConfig.embeddingProvider}`,
    );
  }

  return serverEmbeddingConfig;
}

export function getValidatedAuthConfig(): ServerAuthConfig {
  const jwtAccessSecret = appConfig.security.jwtAccessSecret ?? "";
  const jwtRefreshSecret = appConfig.security.jwtRefreshSecret ?? "";
  const missingFields: string[] = [];

  if (!jwtAccessSecret) missingFields.push("JWT_ACCESS_SECRET");
  if (!jwtRefreshSecret) missingFields.push("JWT_REFRESH_SECRET");

  if (missingFields.length > 0) {
    throw new Error(
      `登录鉴权配置缺失：${missingFields.join("、")}。请在 .env.local 中配置长随机字符串后重启项目。`,
    );
  }

  return {
    jwtAccessSecret,
    jwtRefreshSecret,
    accessTokenExpiresIn: appConfig.security.accessTokenExpiresIn,
    refreshTokenExpiresIn: appConfig.security.refreshTokenExpiresIn,
  };
}
