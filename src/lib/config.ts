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
