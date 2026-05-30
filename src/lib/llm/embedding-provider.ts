export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// Embedding Provider 是“向量模型适配层”。
// 业务代码只依赖 embed / embedBatch，不直接绑定某个厂商，后续更换模型供应商时改实现即可。
