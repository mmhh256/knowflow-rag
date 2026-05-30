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
    lancedbPath: string;
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

export type ServerEmbeddingConfig = {
  embeddingProvider: string;
  embeddingApiKey: string;
  embeddingBaseUrl: string;
  embeddingModel: string;
  lancedbPath: string;
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

// 所有环境变量集中从 appConfig 读取，避免在组件或接口里到处写 process.env。
// API Key 只能在后端使用，不能返回给浏览器，否则用户可以在源码或 Network 中看到密钥。
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
