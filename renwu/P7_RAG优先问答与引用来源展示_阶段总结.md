# P7 RAG 优先问答与引用来源展示 阶段总结

## 一、本阶段完成了什么

本阶段只完成 P7：聊天接口改造成 RAG 优先问答，并在前端展示回答模式和引用来源。没有做 SSE、停止生成、多轮上下文、LangGraph 或登录。

1. `src/lib/vector/document-vector-store.ts`
   - 作用：在 P6 的向量写入基础上新增 `searchSimilarChunks`。
   - 为什么修改：P7 需要用用户问题的 queryVector 去 LanceDB 检索相似文档 chunk。
   - 和其他文件的关系：`retrieveRelevantChunks` 调用它返回 sources。

2. `src/lib/rag/retrieve.ts`
   - 作用：实现 RAG 检索服务。
   - 为什么创建：它负责判断是否有 indexed 文档、生成问题 embedding、检索 LanceDB、判断阈值。
   - 和其他文件的关系：`answer-question.ts` 调用它决定走 RAG 还是 fallback。

3. `src/lib/rag/build-prompt.ts`
   - 作用：把用户问题和 sources 拼成 RAG Prompt。
   - 为什么创建：大模型本身不知道本地知识库内容，必须把检索到的片段放进 Prompt。
   - 和其他文件的关系：RAG 命中时由 `answerQuestionWithRagPriority` 调用。

4. `src/lib/rag/answer-question.ts`
   - 作用：实现 RAG 优先主流程。
   - 为什么创建：统一处理“先检索，命中走 RAG，不命中走普通 LLM 兜底”。
   - 和其他文件的关系：`/api/chat` 调用它生成最终回答。

5. `src/app/api/chat/route.ts`
   - 作用：保留 P4 的消息保存能力，同时改为调用 RAG 优先回答。
   - 为什么修改：assistant 消息现在需要保存 `sources`、`answerMode`、`retrievalStatus`、`fallbackReason`。
   - 和其他文件的关系：调用 `answerQuestionWithRagPriority`，并把结果写入 `Message` 表。

6. `src/components/chat/SourcePanel.tsx`
   - 作用：展示真实引用来源。
   - 为什么创建：RAG 命中时用户需要看到回答依据来自哪个文档、哪个 chunk、命中文本是什么。
   - 和其他文件的关系：`MessageBubble` 在 assistant 消息下方渲染它。

7. `src/components/chat/MessageBubble.tsx`
   - 作用：展示回答模式、检索状态、fallback 原因和 sources。
   - 为什么修改：P7 后每条 assistant 消息都可能是 RAG 或 fallback，前端要让用户看明白。

8. `src/lib/types/chat.ts`
   - 作用：给 `SourceChunk` 增加 `fileType`，补充 score 注释。
   - 为什么修改：sources 需要更完整地表达来源文档信息。

9. `src/components/chat/types.ts`
   - 作用：导出 `RetrievalStatus`，供前端组件做状态文案映射。

10. `src/lib/config.ts`
    - 作用：把 `RAG_SCORE_THRESHOLD` 默认值改为 `0.35`。
    - 为什么修改：P7 需要一个可调阈值来决定检索结果是否足够相关。

11. `.env.example`
    - 作用：同步把 `RAG_SCORE_THRESHOLD=0.35` 写入示例配置。

## 二、本阶段的完整开发思路

我先做向量检索方法，因为 P7 的核心前提是“能从 LanceDB 找到和用户问题相关的 chunk”。`searchSimilarChunks` 会用 queryVector 检索 `document_chunks` 表，并把 LanceDB 返回的 `_distance` 转成项目内部的 `score`。

然后做 `retrieveRelevantChunks`。它负责完整检索判断：没有 indexed 文档就是 `no_documents`，LanceDB 查不到结果就是 `no_chunks`，最高分低于阈值就是 `low_score`，异常就是 `error`，只有真正命中才是 `hit`。

接着做 `buildRagMessages`。检索到 chunk 后，还不能直接回答，必须把这些片段拼进 Prompt，并要求模型不要编造来源。

然后做 `answerQuestionWithRagPriority`。它是 P7 的主流程：先 retrieve；如果 `hit`，构造 RAG Prompt 调用聊天模型；否则构造普通 fallback Prompt 调用聊天模型。

最后改造 `/api/chat` 和前端。后端保存 answerMode、retrievalStatus、sources；前端展示“知识库增强回答”或“普通模型回答”，并在 RAG 命中时展示引用来源。

P7 和后续关系：P8 会把当前一次性返回 answer 改成 SSE 流式输出；P9 会在此基础上加入多轮上下文；P10 会把模型配置做成更完整的设置能力。

## 三、逐个知识点讲解

**什么是 RAG**

RAG 是 Retrieval-Augmented Generation，意思是“检索增强生成”。先从知识库检索相关资料，再让大模型基于这些资料回答。

**什么是 RAG 优先**

本项目没有手动切换模式。用户正常提问，系统先尝试知识库检索；命中就用 RAG，不命中就 fallback。

**什么是 fallback**

fallback 是兜底回答。当没有 indexed 文档、没有 chunk、相似度太低或检索异常时，系统不用知识库，改用普通大模型回答。

**什么是 query embedding**

用户问题也要转成向量，这个向量叫 query embedding。本项目里 `retrieveRelevantChunks` 调用 Embedding Provider 把问题转成 `queryVector`。

**用户问题为什么也要转向量**

文档 chunk 已经在 P6 转成向量。要比较“问题”和“文档片段”是否相似，问题也必须转成同一个向量空间里的数字。

**什么是 Top-K 检索**

Top-K 表示最多返回 K 条最相似的 chunk。本项目默认 `RAG_TOP_K=5`。

**什么是相似度阈值**

阈值决定“检索结果是否足够相关”。本项目默认 `RAG_SCORE_THRESHOLD=0.35`。低于阈值时不强行用知识库。

**什么是 sources**

sources 是引用来源。它包含文件名、chunkIndex、命中文本和 score。用户能看到回答依据来自哪里。

**为什么 RAG 答案必须可追溯**

RAG 的价值不只是回答，还包括可验证。sources 能帮助用户判断回答是否真的来自资料。

**retrievalStatus 有什么作用**

它告诉前端检索发生了什么：命中、没有文档、没有 chunk、低相关或异常。

**answerMode 有什么作用**

它告诉前端本次回答是 `rag` 还是 `fallback`，也会保存到数据库，刷新历史消息后仍能看到。

**Prompt 是什么**

Prompt 是发给大模型的指令和上下文。RAG Prompt 会包含用户问题和参考资料。

**为什么要把文档片段拼进 Prompt**

大模型不能直接读取 LanceDB。我们必须把检索到的 chunk 文本放进 messages，让模型基于这些内容回答。

**为什么相似度低时不能强行使用知识库**

低相关内容会误导模型，导致“看起来基于资料，实际上答偏了”。所以低分时宁愿 fallback。

**为什么 P7 不做多轮上下文和 SSE**

P7 只验证 RAG 优先问答链路。SSE 是 P8，多轮上下文是 P9，分开做更容易排错。

## 四、关键代码逐段讲解

**1. LanceDB 相似检索**

位置：`src/lib/vector/document-vector-store.ts`

```ts
let query = table
  .vectorSearch(params.queryVector)
  .limit(params.topK)
  .select(["id", "documentId", "fileName", "fileType", "content", "chunkIndex", "_distance"]);
```

这段代码用用户问题向量去找最相似的 chunk。`queryVector` 是问题 embedding，`topK` 是最多返回几条，`_distance` 是 LanceDB 返回的距离。

初学者容易看不懂的是 distance 和 score：distance 越小越相关，项目里统一转成 score，score 越大越相关。

**2. 检索状态判断**

位置：`src/lib/rag/retrieve.ts`

```ts
if (indexedDocuments.length === 0) return { status: "no_documents", sources: [] };
if (sources.length === 0) return { status: "no_chunks", sources: [] };
if (bestScore < threshold) return { status: "low_score", sources: [] };
```

这段代码决定是否使用知识库。不是只要检索到东西就用，还要过阈值判断。

**3. 构造 RAG Prompt**

位置：`src/lib/rag/build-prompt.ts`

```ts
content: [
  "用户问题：",
  params.question,
  "",
  "参考资料：",
  sourceText,
].join("\n")
```

这段代码把问题和资料拼在一起。模型看到参考资料后，才能基于知识库回答。

**4. RAG 优先主流程**

位置：`src/lib/rag/answer-question.ts`

```ts
const retrieval = await retrieveRelevantChunks({ question: params.question });

if (retrieval.status === "hit") {
  const answer = await chatProvider.generate(buildRagMessages(...));
  return { answerMode: "rag", retrievalStatus: "hit", sources: retrieval.sources };
}
```

这段代码解决“什么时候走 RAG，什么时候 fallback”的问题。只有 `hit` 才走 RAG，其他状态都走 fallback。

**5. 保存 assistant 消息**

位置：`src/app/api/chat/route.ts`

```ts
await prisma.message.create({
  data: {
    role: "assistant",
    content: result.answer,
    sources: result.sources,
    answerMode: result.answerMode,
    retrievalStatus: result.retrievalStatus,
    fallbackReason: result.fallbackReason,
  },
});
```

这段代码保证刷新页面后，历史消息仍然能看到回答模式和引用来源。

## 五、本阶段的重难点

1. RAG 不是直接问大模型：它先检索资料，再把资料交给模型。
2. 先检索再生成：这样回答可以基于本地知识库，而不是只靠模型通用知识。
3. fallback 必须存在：知识库不完整时，用户仍然能得到回答。
4. 相似度阈值很重要：它能避免低相关资料误导模型。
5. sources 要返回前端：用户需要看到回答依据。
6. answerMode 和 retrievalStatus 要保存数据库：历史消息也要可解释。
7. 检索失败不应该让整个聊天失败：检索只是增强能力，失败时可以普通回答。
8. 模型生成失败才是真正错误：没有模型输出就没有 answer 可以返回。

## 六、本阶段容易出错的地方

1. LanceDB 搜索字段名不对：本项目统一读取 `_distance`。
2. score 和 distance 理解反了：distance 越小越相关，score 越大越相关。
3. 阈值设置不合理：太高容易一直 fallback，太低容易使用无关资料。
4. embedding 维度不一致：文档和问题必须使用同一个 embedding 模型。
5. 检索到无关内容还强行回答：本项目用阈值拦截。
6. Prompt 没有限制模型：`buildRagMessages` 明确要求不要编造。
7. sources 没保存数据库：`/api/chat` 保存 assistant 消息时写入了 sources。
8. 刷新后历史消息看不到引用来源：历史消息接口会把 sources 转回前端类型。
9. fallback 时没有提示：前端展示 retrievalStatus 和 fallbackReason。
10. sources 为空时报错：`SourcePanel` 只在 sources 有内容时渲染。

## 七、我应该怎么运行和测试

1. 确认环境变量：

```env
LLM_API_KEY=...
LLM_BASE_URL=...
LLM_MODEL=...
EMBEDDING_API_KEY=...
EMBEDDING_BASE_URL=...
EMBEDDING_MODEL=...
RAG_TOP_K=5
RAG_SCORE_THRESHOLD=0.35
LANCEDB_PATH="./data/lancedb"
```

2. 启动项目：

```bash
npm run dev
```

3. 准备测试文档：
   - 上传一个 TXT / MD / PDF。
   - 确认状态变成“已解析，待向量化”。
   - 点击“向量化”，确认状态变成“已入库，可用于问答”。

4. 测试 RAG 命中：
   - 在 `/chat` 提问一个和文档内容高度相关的问题。
   - 正常结果：assistant 显示“知识库增强回答”，下面有引用来源。

5. 测试没有文档的 fallback：
   - 删除或不索引文档。
   - 提问后应显示“普通模型回答”，retrievalStatus 为 `no_documents`。

6. 测试低相关 fallback：
   - 问一个和文档完全无关的问题。
   - 如果最高 score 低于阈值，会显示普通模型回答。

7. 数据库检查：
   - 查看 `message` 表。
   - assistant 消息应有 `sources`、`answerMode`、`retrievalStatus`、`fallbackReason`。

8. 如果报错，优先检查：
   - DeepSeek / LLM 网络是否可访问。
   - Embedding API 是否可访问。
   - 文档是否已经 `indexed`。
   - `data/lancedb` 是否存在向量数据。
   - Embedding 模型是否和 P6 索引时一致。

## 八、面试时我应该怎么说

**30 秒简短版**

在 P7 阶段，我把聊天接口改造成了 RAG 优先。用户提问后，后端会先把问题转成 embedding，到 LanceDB 检索相关文档 chunk。如果命中且相似度达标，就把 chunk 拼进 Prompt，让模型基于知识库回答并返回 sources；如果没命中，就 fallback 到普通模型回答。

**1 分钟详细版**

这一阶段我主要完成了 RAG 问答主链路。我先在 LanceDB 存储层增加了 `searchSimilarChunks`，把用户问题向量和文档 chunk 向量做相似检索。然后封装了 `retrieveRelevantChunks`，统一处理 no_documents、no_chunks、low_score、error 和 hit。命中时，我用 `buildRagMessages` 把参考资料拼进 Prompt，再调用原来的 Chat Provider 生成回答。最后 `/api/chat` 会保存 answerMode、retrievalStatus、sources，前端也能展示“知识库增强回答”和引用来源。

**追问展开版**

如果继续展开，我会说 P7 最关键的是不要盲目使用知识库。即使 LanceDB 返回了 chunk，也要看 score 是否达到阈值。只有强相关内容才进入 RAG Prompt，否则走 fallback。这样能避免模型基于无关资料回答。sources 里保存了 documentId、fileName、chunkIndex、content 和 score，所以前端可以展示引用来源，数据库也能持久化这些信息，刷新历史消息后仍然可追溯。

## 九、面试官可能追问的问题

1. RAG 是什么？
   - 先检索相关资料，再让模型基于资料生成回答。

2. 为什么要用 RAG？
   - 它能让模型回答本地知识库内容，并提供可追溯来源。

3. 为什么不是直接把整个文档给模型？
   - 文档太长，成本高且不精准，容易超过上下文限制。

4. 用户问题为什么也要 embedding？
   - 要和文档 chunk 向量做相似度比较。

5. Top-K 是什么？
   - 返回最相似的前 K 个 chunk。

6. 相似度阈值怎么定？
   - 第一版用配置值，后续根据真实效果调参。

7. sources 是怎么来的？
   - 来自 LanceDB 检索命中的 chunk metadata 和 content。

8. 如果检索不到内容怎么办？
   - fallback 到普通模型回答，并告诉用户原因。

9. 如果检索到无关内容怎么办？
   - 用 score threshold 判断，低于阈值就不使用。

10. 为什么要保存 answerMode？
    - 让历史消息也能显示本次回答是否用了知识库。

11. RAG 和普通 LLM 回答有什么区别？
    - RAG 基于检索到的资料回答，并返回 sources；普通 LLM 不使用知识库来源。

12. P7 和 P8 流式输出有什么关系？
    - P7 现在一次性返回完整 answer，P8 会把生成过程改为 SSE 流式输出。

13. P7 和 LangGraph 有什么关系？
    - P7 是确定性 RAG 流程，LangGraph 是后续更复杂的 Agent 编排，不在本阶段做。

## 十、下一阶段要做什么

下一阶段应该进入 **P8：SSE 流式输出与停止生成**。

P7 当前是一次性返回完整 answer。P8 会把 answer 改造成流式逐步输出，同时继续保留 RAG 优先、fallback、sources、answerMode 和 retrievalStatus 的能力。
