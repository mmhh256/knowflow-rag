# P6 文本分块、Embedding 与 LanceDB 向量入库 阶段总结

## 一、本阶段完成了什么

本阶段只完成 P6：把 P5 已解析出来的 `parsedText` 切成 chunk，调用外部 Embedding API 生成向量，再写入 LanceDB。本阶段没有改 `/api/chat` 做 RAG 问答，也没有返回真实 sources。

1. `src/lib/rag/chunk-text.ts`
   - 作用：实现 `chunkText`，把长文本按字符长度切成多个 chunk。
   - 为什么创建：RAG 检索不能直接处理整篇文档，必须先把文档拆成可检索的小片段。
   - 和其他文件的关系：`indexDocument` 会调用它，把 `Document.parsedText` 切成 chunk。

2. `src/lib/llm/embedding-provider.ts`
   - 作用：定义统一的 `EmbeddingProvider` 接口。
   - 为什么创建：业务代码只依赖 `embed` 和 `embedBatch`，后续换 Embedding 模型供应商时不用改索引流程。
   - 和其他文件的关系：`openai-compatible-embedding.ts` 实现这个接口。

3. `src/lib/llm/openai-compatible-embedding.ts`
   - 作用：调用 OpenAI-compatible 的 Embedding API。
   - 为什么创建：P6 需要把 chunk 文本转换成向量。
   - 和其他文件的关系：`indexDocument` 使用 `createEmbeddingProvider()` 批量生成向量。

4. `src/lib/vector/lancedb-client.ts`
   - 作用：连接本地 LanceDB。
   - 为什么创建：LanceDB 是本地向量库，用来保存 chunk 的 embedding。
   - 和其他文件的关系：`document-vector-store.ts` 通过它拿到 LanceDB 连接。

5. `src/lib/vector/document-vector-store.ts`
   - 作用：实现 `addDocumentChunks` 和 `deleteDocumentVectors`。
   - 为什么创建：索引文档时要写入向量；重新索引或删除文档时要清理旧向量。
   - 和其他文件的关系：`indexDocument` 写入向量，文档删除接口清理向量。

6. `src/lib/rag/index-document.ts`
   - 作用：实现完整索引服务：查文档、改状态、分块、embedding、删旧向量、写入 LanceDB、更新 `chunkCount`。
   - 为什么创建：把“文档变成可检索向量数据”的流程集中到一个服务层。
   - 和其他文件的关系：`POST /api/documents/[id]/index` 调用它。

7. `src/app/api/documents/[id]/index/route.ts`
   - 作用：新增手动索引接口。
   - 为什么创建：P6 采用手动索引，方便我先检查 parsedText，再触发向量化。
   - 和其他文件的关系：`/documents` 页面点击“向量化 / 重新索引”会调用它。

8. `src/app/documents/page.tsx`
   - 作用：新增“向量化 / 重新索引”按钮、索引 loading 状态、索引成功/失败提示。
   - 为什么修改：知识库页面需要展示文档是否已经入库，以及 chunk 数量。
   - 和其他文件的关系：调用 `/api/documents/[id]/index`，更新文档状态和 `chunkCount`。

9. `src/lib/types/document.ts`
   - 作用：给 `KnowledgeDocument` 增加 `indexError`，新增 `DocumentIndexResponse`。
   - 为什么修改：索引失败时前端需要展示错误原因，索引接口也需要有明确响应类型。

10. `src/lib/types/vector.ts`
    - 作用：定义 `DocumentVectorRecord`。
    - 为什么创建：向量库记录需要包含 vector、content、documentId、fileName、chunkIndex 等字段。

11. `src/lib/config.ts`
    - 作用：补充 `serverEmbeddingConfig` 和 `getValidatedServerEmbeddingConfig()`。
    - 为什么修改：Embedding API Key 只能在后端读取，不能暴露给浏览器。
    - 和其他文件的关系：Embedding Provider 通过它读取 `EMBEDDING_API_KEY`、`EMBEDDING_BASE_URL`、`EMBEDDING_MODEL`。

12. `prisma/schema.prisma`
    - 作用：给 `Document` 增加 `indexError String? @db.Text`。
    - 为什么修改：索引失败时需要把失败原因保存下来，刷新页面后也能看到。

13. `prisma/migrations/20260530090929_add_document_index_error/migration.sql`
    - 作用：把 `indexError` 字段同步到 MySQL。

14. `src/app/api/documents/[id]/route.ts`
    - 作用：删除文档时同步删除 LanceDB 中的旧向量。
    - 为什么修改：避免 P7 检索到已经删除的文档 chunk。

15. `next.config.ts`
    - 作用：配置 `serverExternalPackages: ["@lancedb/lancedb"]`。
    - 为什么修改：LanceDB 是原生 Node 包，不能被 Turbopack 打进 ESM chunk，必须作为服务端外部包加载。

16. `.gitignore`
    - 作用：忽略 `data/lancedb` 中真实生成的向量库文件。

17. `package.json` / `package-lock.json`
    - 作用：新增 `@lancedb/lancedb` 依赖。

## 二、本阶段的完整开发思路

我先做文本分块，因为 embedding 的输入不是整篇文档，而是一个个 chunk。分块先采用简单字符切分：默认 800 字左右，100 字 overlap。这样简单、稳定，适合 P6 第一版。

然后做 Embedding Provider。它把文本变成向量，接口统一成 `embed` 和 `embedBatch`。这样 `indexDocument` 不需要知道外部接口细节，只管把 chunk 内容交给 Provider。

接着接 LanceDB。MySQL 适合存结构化业务数据，比如文档名、状态、消息；LanceDB 适合存向量和做相似度检索。P6 先写入，不做搜索。

然后做 `indexDocument` 服务。它是 P6 的核心：读取 `parsedText`，更新状态为 `indexing`，分块，生成 embedding，删除旧向量，写入新向量，最后把状态改成 `indexed` 并更新 `chunkCount`。

最后做 API 和前端按钮。索引接口单独拆出来，是为了让上传解析和向量化分开，方便学习和调试。页面上只有 `parsed`、`indexed`、`index_failed` 的文档可以点“向量化 / 重新索引”。

P6 和 P7 的关系：P6 负责把文档资料变成 LanceDB 中的向量记录；P7 会把用户问题也向量化，再从 LanceDB 检索 Top-K chunk，构造 Prompt，返回 answer 和 sources。

## 三、逐个知识点讲解

**什么是文本分块 chunk**

chunk 就是文档的一小段文本。本项目里 `chunkText` 会把 `parsedText` 切成多个 `{ content, chunkIndex }`。

**为什么 RAG 不能直接把整篇文档塞给模型**

整篇文档可能很长，超过模型上下文限制，也会让回答不精准。RAG 的思路是先检索最相关的小片段，再把这些片段交给模型。

**chunkSize 是什么**

`chunkSize` 是每个 chunk 的目标长度。本项目默认用 `RAG_CHUNK_SIZE=800`，适合中文文档的第一版实现。

**overlap 是什么**

overlap 是相邻 chunk 重复的一段文本。本项目默认 `RAG_CHUNK_OVERLAP=100`，目的是避免一句话正好被切断，导致上下文断裂。

**embedding 是什么**

embedding 是把文字变成一组数字，比如 `[0.01, -0.2, ...]`。语义接近的文本，向量距离也更近。

**为什么文字可以变成向量**

Embedding 模型学习了大量文本之间的语义关系，所以能把“意思”编码成数字。后续检索时，不是按关键词完全匹配，而是按语义相似度查找。

**什么是向量数据库**

向量数据库专门用来存储和检索向量。它可以快速找出和某个问题向量最相似的文档 chunk。

**LanceDB 是什么**

LanceDB 是本地向量数据库。它不需要额外启动服务，适合这个学习项目先把向量流程跑通。

**为什么向量库里要保存 content 和 metadata**

如果只保存 vector，P7 检索命中后不知道原文是什么，也不知道来自哪个文档。所以每条向量记录保存了 `content`、`documentId`、`fileName`、`chunkIndex`。

**为什么问题也要生成向量**

P6 只做文档向量入库。P7 用户提问时，会把问题也生成向量，再和文档 chunk 向量做相似度比较。

**为什么 P6 不做问答**

因为 P6 的职责是“建索引”。问答需要检索、阈值判断、Prompt 拼接、sources 返回，这些属于 P7。

**Document.status 中 indexing / indexed / index_failed 的意义**

- `indexing`：正在向量化
- `indexed`：已经写入 LanceDB，可供后续 RAG 检索
- `index_failed`：向量化失败，原因保存在 `indexError`

**chunkCount 是什么**

`chunkCount` 表示一个文档被切成了多少个 chunk。它大于 0，通常说明文档已经被成功索引。

**重新索引为什么要删除旧向量**

如果不删除旧向量，同一个文档会重复写入，P7 检索时可能命中重复内容。`deleteDocumentVectors(documentId)` 会在重新写入前清理旧数据。

## 四、关键代码逐段讲解

**1. 文本分块**

位置：`src/lib/rag/chunk-text.ts`

```ts
const chunkSize = options.chunkSize ?? 800;
const overlap = options.overlap ?? 100;
start = end - overlap;
```

这段代码解决“长文本怎么变成多个片段”的问题。`chunkSize` 控制每块长度，`overlap` 控制相邻块重复多少内容。初学者容易看不懂的是 `start = end - overlap`，它的意思是下一块不是从上一块结尾开始，而是往回退 100 字，保留上下文。

**2. Embedding 批量调用**

位置：`src/lib/llm/openai-compatible-embedding.ts`

```ts
body: JSON.stringify({
  model: config.embeddingModel,
  input: batch,
})
```

这段代码把一批 chunk 发给外部 Embedding API。`model` 是使用哪个向量模型，`input` 是文本数组。返回后从 `data.data[index].embedding` 拿到向量。

**3. LanceDB 写入**

位置：`src/lib/vector/document-vector-store.ts`

```ts
await db.createTable(DOCUMENT_CHUNKS_TABLE, records);
await table.add(records);
```

如果表不存在，就创建表；如果表已存在，就追加记录。每条记录里既有 `vector`，也有 `content` 和文档元信息。

**4. 重新索引前删除旧向量**

位置：`src/lib/vector/document-vector-store.ts`

```ts
await table.delete(`documentId = '${escapeSqlString(documentId)}'`);
```

这段代码根据 `documentId` 删除旧 chunk。它解决“同一个文档重复索引会堆积重复向量”的问题。

**5. 完整索引流程**

位置：`src/lib/rag/index-document.ts`

```ts
const chunks = chunkText(document.parsedText, {
  chunkSize: appConfig.rag.chunkSize,
  overlap: appConfig.rag.chunkOverlap,
});

const vectors = await embeddingProvider.embedBatch(
  chunks.map((chunk) => chunk.content),
);

await deleteDocumentVectors(document.id);
await addDocumentChunks(records);
```

这段代码就是 P6 核心数据流：`parsedText -> chunks -> vectors -> LanceDB records`。初学者容易混淆 chunk 和 vector：chunk 是原文片段，vector 是这个片段对应的数字表示。

## 五、本阶段的重难点

1. 文本必须分块：因为整篇文档太长，而且检索需要小颗粒度片段。
2. overlap 很重要：它能减少上下文被切断的问题。
3. embedding 必须在后端生成：API Key 不能暴露给浏览器。
4. Provider 适配层能降低耦合：以后换模型供应商时，业务流程不用大改。
5. LanceDB 和 MySQL 分工不同：MySQL 存业务数据，LanceDB 存向量数据。
6. 向量记录必须带 `documentId` 和 `chunkIndex`：P7 返回 sources 时要知道命中文档和片段位置。
7. 重新索引必须先删除旧数据：否则向量库里会出现重复 chunk。
8. P6 不直接做 RAG 问答：这样阶段边界清晰，方便逐步验收。

## 六、本阶段容易出错的地方

1. Embedding API Key 没配置：后端会提示缺少 `EMBEDDING_API_KEY`。
2. baseUrl 写错：OpenAI-compatible 一般需要能拼出 `/embeddings`。
3. embedding 返回维度不一致：同一个向量表里的向量维度必须一致，不能混用不同 embedding 模型。
4. 文档 `parsedText` 为空：没有可索引文本，必须先完成 P5 解析。
5. chunk 切分结果为空：可能文本太短或全是空白。
6. LanceDB 路径不存在：`lancedb-client.ts` 会自动创建目录。
7. 重新索引时旧向量没删：本项目先 `deleteDocumentVectors` 再 `addDocumentChunks`。
8. Document 状态没有正确更新：成功后必须是 `indexed`，失败后是 `index_failed`。
9. `chunkCount` 没更新：页面就无法判断文档切成了多少片段。
10. 向量库里没有保存 `content`：P7 就无法展示引用来源。
11. 前端重复点击索引按钮：页面用 `isIndexingId` 禁用正在处理的按钮。
12. LanceDB 原生包构建失败：本项目在 `next.config.ts` 中配置了 `serverExternalPackages: ["@lancedb/lancedb"]`。

## 七、我应该怎么运行和测试

1. 安装依赖：

```bash
npm install
```

本阶段新增了 `@lancedb/lancedb`。

2. 配置 `.env.local`：

```env
EMBEDDING_PROVIDER=openai-compatible
EMBEDDING_API_KEY=你的_embedding_key
EMBEDDING_BASE_URL=https://api.example.com/v1
EMBEDDING_MODEL=你的_embedding_model
LANCEDB_PATH="./data/lancedb"
```

真实 key 只能放 `.env.local`，不要写到代码里。

3. 执行 Prisma：

```bash
npm run prisma:migrate -- --name add_document_index_error
npm run prisma:generate
```

我本地已经执行过，新增了 `Document.indexError`。

4. 启动项目：

```bash
npm run dev
```

5. 打开页面：

```txt
http://localhost:3000/documents
```

6. 测试流程：
   - 上传 TXT / MD / PDF。
   - 确认状态变成“已解析，待向量化”。
   - 点击“向量化”。
   - 成功后状态变成“已入库，可用于问答”。
   - `chunkCount` 应该大于 0。
   - 重新点击“重新索引”，不应该重复堆积旧向量。

7. 查看 LanceDB：
   - 默认路径是 `data/lancedb`。
   - 索引成功后，这个目录里会出现 LanceDB 表文件。

8. 如果报错，优先检查：
   - `.env.local` 的 Embedding 配置是否完整。
   - Embedding API 是否能从 Node.js 后端访问。
   - 文档是否已解析成功，有没有 `parsedText`。
   - 是否执行了 Prisma migration。
   - 是否重启了 `npm run dev`。

## 八、面试时我应该怎么说

**30 秒简短版**

在 P6 阶段，我主要完成了文档向量化入库。我把 P5 保存的 `parsedText` 按 800 字左右切成 chunk，并保留 100 字 overlap，然后调用外部 Embedding API 批量生成向量，最后把向量和文档元信息写入 LanceDB。这样后续 P7 就可以根据用户问题检索相关 chunk。

**1 分钟详细版**

在这个阶段，我没有直接做 RAG 问答，而是先完成索引链路。我先实现了 `chunkText`，把长文档切成带 `chunkIndex` 的片段；然后封装了 Embedding Provider，让业务层只调用 `embedBatch`，不关心具体供应商；接着接入 LanceDB，把每个 chunk 的 `vector`、`content`、`documentId`、`fileName` 和 `chunkIndex` 存进去。最后我做了 `indexDocument` 服务和手动索引接口，前端可以点击“向量化 / 重新索引”，成功后文档状态会变成 `indexed`，并更新 `chunkCount`。

**追问展开版**

如果继续展开，我会说这里最重要的是数据流和状态管理。数据流是 `Document.parsedText -> chunkText -> embedBatch -> DocumentVectorRecord -> LanceDB`。状态上我给文档增加了 `indexing`、`indexed`、`index_failed`，并新增 `indexError` 保存失败原因。重新索引时，我会先根据 `documentId` 删除旧向量，再写入新向量，避免重复数据。P6 只负责建索引，P7 才会把用户问题向量化并做 Top-K 检索。

## 九、面试官可能追问的问题

1. 为什么要分块？
   - 因为整篇文档太长，不适合直接检索或塞给模型，分块后能更精准地命中相关内容。

2. chunkSize 怎么定？
   - 第一版用 800 字左右，兼顾上下文完整性和检索颗粒度，后续可以根据效果调整。

3. overlap 是什么？
   - 相邻 chunk 重复的一段文本，用来避免句子或段落被切断。

4. embedding 是什么？
   - 把文本转换成向量，让系统可以通过向量距离比较语义相似度。

5. 向量数据库和 MySQL 有什么区别？
   - MySQL 存结构化业务数据，向量数据库负责存向量并做相似度检索。

6. 为什么不用 MySQL 存向量？
   - MySQL 不擅长高效向量相似度搜索，LanceDB 更适合这类场景。

7. LanceDB 在项目里负责什么？
   - 保存文档 chunk 的 embedding 和 metadata，后续 P7 用它检索相关片段。

8. 为什么向量记录里要存原文 content？
   - P7 返回 sources 时需要展示命中的原文片段。

9. 重新索引怎么处理旧数据？
   - 根据 `documentId` 删除旧向量，再写入新向量。

10. 如果 embedding API 调用失败怎么办？
    - `indexDocument` 会把文档状态更新为 `index_failed`，并把错误写入 `indexError`。

11. 如果文档很大怎么优化？
    - 后续可以改成后台任务、分批队列、进度状态和更智能的分块策略。

12. P6 和 P7 的关系是什么？
    - P6 建好向量索引，P7 才能用用户问题向量去检索 Top-K chunk，并生成带 sources 的回答。

## 十、下一阶段要做什么

下一阶段应该进入 **P7：RAG 优先问答与引用来源展示**。

P7 会使用 P6 写入 LanceDB 的 chunk 和向量，流程会变成：

```txt
用户问题向量化
→ LanceDB Top-K 检索
→ 判断相似度阈值
→ 命中则构造 RAG Prompt
→ 返回 answer + sources
→ 前端展示引用来源
```

也就是说，P6 只是把知识库“准备好”，P7 才会真正把知识库接入聊天回答。
