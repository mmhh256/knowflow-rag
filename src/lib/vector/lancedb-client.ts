import { mkdir } from "fs/promises";
import path from "path";

import * as lancedb from "@lancedb/lancedb";

import { serverEmbeddingConfig } from "@/lib/config";

export async function getLanceDbConnection() {
  // LanceDB 是本地向量数据库，适合在学习项目里保存 embedding 向量，不需要先搭独立数据库服务。
  const absolutePath = path.isAbsolute(serverEmbeddingConfig.lancedbPath)
    ? serverEmbeddingConfig.lancedbPath
    : path.join(
        /*turbopackIgnore: true*/ process.cwd(),
        serverEmbeddingConfig.lancedbPath,
      );

  await mkdir(absolutePath, { recursive: true });
  return lancedb.connect(absolutePath);
}
