# P10：LangGraph Agentic RAG 轻量改造阶段总结

## 一、本阶段完成了什么

### 1. `package.json` / `package-lock.json`

这两个文件记录了本阶段新增的依赖：`@langchain/langgraph` 和 `@langchain/core`。

创建原因：P10 要把已有 RAG 流程拆成 LangGraph 节点，所以需要 LangGraph.js。本阶段没有安装 Python 版 LangGraph，也没有接 LangGraph Server / Cloud。

它和其他文件的关系：`src/lib/agent/graph.ts` 会从 `@langchain/langgraph` 中导入 `StateGraph`、`START`、`END` 和 `Annotation`。

### 2. `src/lib/agent/types.ts`

这个文件定义了 Agentic RAG 的共享状态 `AgentRagState`、判断结果 `JudgeResult` 和运行结果 `AgentRagResult`。

创建原因：LangGraph 的核心是 state。P10 需要让“问题改写、检索、判断、生成、兜底”这些节点共享同一份流程数据。

它和其他文件的关系：所有 `src/lib/agent/nodes/*` 节点都读取或更新这个 state，`graph.ts` 也用它定义整条图的输入和输出。

### 3. `src/lib/agent/nodes/query-rewrite.ts`

这是 QueryRewriteNode，负责结合历史消息把追问改写成更适合检索的完整问题。

创建原因：像“第二点详细说一下”这种问题直接做 embedding，检索效果通常很差。改写后再检索，可以提高命中正确 chunk 的概率。

它和其他文件的关系：它复用 `createOpenAICompatibleChatProvider()` 调外部模型，输出 `rewrittenQuestion`，后面的 RetrieveNode 会优先使用它。

### 4. `src/lib/agent/nodes/retrieve.ts`

这是 RetrieveNode，负责调用已有的 `retrieveRelevantChunks()` 检索知识库。

创建原因：P10 不重写 P7 的检索逻辑，而是把它包装成 LangGraph 节点。

它和其他文件的关系：它复用 `src/lib/rag/retrieve.ts`，把结果写入 `sources`、`retrievalStatus` 和 `fallbackReason`。

### 5. `src/lib/agent/nodes/judge.ts`

这是 JudgeNode，负责判断检索到的资料是否足够回答问题。

创建原因：P7 主要靠相似度阈值判断，P10 增加一个轻量 LLM 判断，让系统更接近 Agentic RAG：检索到 chunk 后，再判断资料是否真的能支撑回答。

它和其他文件的关系：如果判断结果是 `enough`，图会走 GenerateRagNode；如果是 `not_enough`，图会走 FallbackNode。

### 6. `src/lib/agent/nodes/generate-rag.ts`

这是 GenerateRagNode，负责在资料足够时构造 RAG Prompt，并生成知识库增强回答。

创建原因：把“基于 sources 生成答案”单独拆出来，职责更清楚。

它和其他文件的关系：它复用 `buildRagMessages()`，普通接口会让它直接生成 `answer`；流式接口会让它只准备 `messages`，再交给 SSE 流式输出。

### 7. `src/lib/agent/nodes/fallback.ts`

这是 FallbackNode，负责在资料不足、检索异常或判断失败时走普通模型回答。

创建原因：fallback 不是失败，而是系统的兜底策略。它可以保证知识库不可用时，聊天功能仍然可用。

它和其他文件的关系：它复用 `buildFallbackMessages()`，并保证 fallback 时 `sources = []`。

### 8. `src/lib/agent/graph.ts`

这是 LangGraph 状态图组装文件。

创建原因：把节点连接成流程：`START -> queryRewrite -> retrieve -> judge -> generateRag / fallback -> END`。

它和其他文件的关系：它导出 `runAgenticRag()` 给普通接口使用，导出 `prepareAgenticRagMessages()` 给 SSE 流式接口使用。

### 9. `src/lib/rag/prepare-answer.ts`

这个文件从 P9 的普通 RAG 准备流程，改成调用 LangGraph 的 `prepareAgenticRagMessages()`。

修改原因：P8 的流式接口需要先拿到 `messages`、`answerMode`、`sources` 等元信息，再逐步输出 token。

它和其他文件的关系：`/api/chat/stream` 继续调用它，因此 P10 没有破坏 P8 的 SSE。

### 10. `src/lib/rag/answer-question.ts`

这个文件改成调用 `runAgenticRag()`。

修改原因：普通 `/api/chat` 一次性接口可以让 LangGraph 完整执行到最终答案。

它和其他文件的关系：`app/api/chat/route.ts` 调用它，拿到 answer、sources、answerMode、retrievalStatus、rewrittenQuestion 和 judgeReason。

### 11. `src/app/api/chat/route.ts`

普通聊天接口改成使用 Agentic RAG。

修改原因：P10 后，普通接口不再直接走一个大函数式 RAG 流程，而是走 LangGraph 状态图。

它和其他文件的关系：仍然保留 P4 的会话和消息保存逻辑，仍然保存 assistant 的 sources、answerMode、retrievalStatus、fallbackReason。

### 12. `src/app/api/chat/stream/route.ts`

流式接口保留 SSE，同时接入 Agentic RAG 准备流程。

修改原因：P10 第一版不要求每个 LangGraph 节点都流式输出，只要求最终答案继续流式输出。

它和其他文件的关系：先调用 `prepareRagPriorityAnswer()` 得到 messages 和 meta，再用 `ChatModelProvider.stream()` 输出 token。

### 13. `src/lib/types/chat.ts` / `src/lib/types/rag.ts`

`ChatResponse`、`ChatStreamMeta`、`ChatMessage` 增加了 `rewrittenQuestion` 和 `judgeReason`。

修改原因：前端需要能折叠展示 Agent 调试信息，解释系统为什么这样检索和判断。

它和其他文件的关系：后端 meta 返回这些字段，`MessageBubble` 负责展示。

### 14. `src/app/chat/page.tsx`

流式接收 `meta` 时，把 `rewrittenQuestion` 和 `judgeReason` 写入 assistant 临时消息。

修改原因：让前端能展示 Agentic RAG 的可解释信息。

### 15. `src/components/chat/MessageBubble.tsx`

assistant 消息下增加了“Agent 调试信息”折叠区域。

修改原因：默认不打扰用户阅读答案，但需要时可以展开查看“检索问题”和“资料判断”。

## 二、本阶段的完整开发思路

第一步先定义 `AgentRagState`。因为 LangGraph 不是靠函数参数一层层传递，而是靠 state 在节点之间流动。先把 state 设计清楚，后面的节点边界才清楚。

第二步拆节点。QueryRewriteNode 解决追问检索不完整的问题；RetrieveNode 复用已有向量检索；JudgeNode 判断资料是否足够；GenerateRagNode 生成知识库回答；FallbackNode 做普通模型兜底。

第三步组装 LangGraph。图里最关键的是条件边：JudgeNode 输出 `judgeResult` 后，如果是 `enough` 就走 RAG 回答，否则走 fallback。

第四步改造后端接口。普通 `/api/chat` 使用 `runAgenticRag()` 完整生成答案；`/api/chat/stream` 使用 `prepareAgenticRagMessages()` 只准备 messages，然后继续使用 P8 的流式输出。

第五步改造前端展示。P10 不改变聊天主体验，只在 assistant 消息里折叠显示 `rewrittenQuestion` 和 `judgeReason`，增强可解释性。

P10 和 P7/P8/P9 的关系：P7 提供 RAG 优先和 sources，P8 提供 SSE，P9 提供历史消息，P10 把这些能力拆成可解释的 LangGraph 节点。

## 三、逐个知识点讲解

### 1. 什么是 LangGraph

LangGraph 是一种把复杂流程拆成节点和边的工具。它不像普通函数那样从上到下一口气写完，而是让每个节点负责一个步骤。

本项目里用在 `src/lib/agent/graph.ts`，负责组织问题改写、检索、判断、生成和兜底。

### 2. 什么是 Agentic RAG

普通 RAG 通常是“检索 -> 拼 Prompt -> 生成”。Agentic RAG 会多一些可控步骤，比如问题改写、资料判断、条件分支。

本项目 P10 的 Agentic RAG 是轻量版，没有做工具调用、多 Agent 或复杂 Planner。

### 3. 什么是节点 node

节点就是一个独立步骤。比如 `queryRewriteNode` 只负责改写问题，`judgeNode` 只负责判断资料是否足够。

这样做比一个大函数更容易维护，也更容易面试讲清楚。

### 4. 什么是边 edge 和条件边 conditional edge

边表示流程顺序。普通边是固定走向，比如 queryRewrite 后一定 retrieve。

条件边是根据 state 决定下一步。本项目里 `judgeResult === "enough"` 走 `generateRag`，否则走 `fallback`。

### 5. 什么是 state

state 是整条流程共享的数据对象。`AgentRagState` 里有 question、historyMessages、rewrittenQuestion、sources、judgeReason、answerMode 等字段。

每个节点只更新自己负责的字段。

### 6. 问题改写为什么重要

多轮追问里，用户常说“第二点详细说一下”。这句话本身没有完整语义，直接检索知识库可能找不到正确内容。

QueryRewriteNode 会结合历史消息，把它改写成更完整的问题，但不会改变前端展示的原始问题。

### 7. JudgeNode 为什么有价值

相似度分数只能说明“向量上接近”，不一定说明资料真的能回答问题。JudgeNode 用模型做一次轻量判断，减少把无关资料硬塞进 Prompt 的情况。

### 8. fallback 为什么不是失败

fallback 是兜底策略。知识库没有文档、没有 chunk、资料不够或判断异常时，系统仍可以用普通模型回答，并明确告诉用户没有使用知识库来源。

### 9. 为什么保留 SSE 和多轮上下文

P10 不是重做聊天系统。`prepare-answer.ts` 仍然读取 P9 的历史消息，`/api/chat/stream` 仍然使用 P8 的 token 流式输出。

## 四、关键代码逐段讲解

### 1. Agent State：`src/lib/agent/types.ts`

`AgentRagState` 里最重要的字段是：

```ts
question: string;
historyMessages: ChatProviderMessage[];
rewrittenQuestion?: string;
sources: SourceChunk[];
judgeResult?: "enough" | "not_enough";
messages: ChatProviderMessage[];
answer?: string;
```

它解决的问题是：每个节点不需要互相直接调用，只要读写 state。

初学者容易不懂的是：state 不是 React state，而是 LangGraph 工作流内部的共享流程数据。

### 2. 问题改写：`src/lib/agent/nodes/query-rewrite.ts`

这个节点读取 `question` 和 `historyMessages`，调用模型输出 `rewrittenQuestion`。

如果没有历史消息，或者改写失败，它会返回原问题。这样不会因为改写节点异常导致整个聊天失败。

### 3. 条件分支：`src/lib/agent/graph.ts`

核心逻辑是：

```ts
function routeAfterJudge(state: AgentRagState) {
  return state.judgeResult === "enough" ? "generateRag" : "fallback";
}
```

这段代码决定了资料足够时走知识库回答，资料不足时走普通模型兜底。

### 4. 流式兼容：`src/app/api/chat/stream/route.ts`

流式接口先调用 `prepareRagPriorityAnswer()`，拿到 meta 和 messages，然后继续使用：

```ts
for await (const token of chatProvider.stream(prepared.messages)) {
  sendEvent("token", { content: token });
}
```

这样 P10 没有破坏 P8 的 SSE，也没有强行让每个 LangGraph 节点流式。

## 五、本阶段的重难点

1. 不能为了用 LangGraph 而过度复杂化。本阶段只做轻量 Agentic RAG，不做工具调用、多 Agent、LangGraph Server。
2. 问题改写只能用于检索，不能替换前端用户原始问题。
3. JudgeNode 要容错。如果模型返回的不是标准 JSON，代码会做简单解析；解析失败时保守 fallback。
4. 流式接口不能被破坏。P10 采用“图准备 messages，Provider 负责最终流式输出”的方案。
5. 多轮上下文不能丢。`prepare-answer.ts` 仍然先读取历史消息，再让 LangGraph 使用这些历史。
6. fallback 时必须清空 sources，避免用户误以为普通模型回答来自知识库。

## 六、本阶段容易出错的地方

1. 把 LangGraph 做成复杂 Agent 系统：P10 只需要轻量流程图。
2. 重写一套 RAG：应该复用 P7 的 `retrieveRelevantChunks()` 和 Prompt 构造。
3. 当前问题重复进入 prompt：需要先读取历史，再保存当前 user 消息。
4. Judge 输出不是 JSON：需要容错，不能让接口崩溃。
5. 条件边写错：会导致资料够时却 fallback，或者资料不足时强行 RAG。
6. fallback 没清空 sources：会误导用户。
7. SSE 被破坏：流式接口应继续返回 meta、token、done、error。
8. 类型重复定义：`SourceChunk` 继续复用 `lib/types/chat.ts`。

## 七、我应该怎么运行和测试

1. 安装依赖后如果是第一次拉代码，执行：

```bash
npm install
```

2. 确认 `.env.local` 里已有 LLM、Embedding、DATABASE_URL 和 LanceDB 配置。

3. 启动项目：

```bash
npm run dev
```

4. 打开：

```txt
http://localhost:3000/chat
```

5. 准备测试文档：先在 `/documents` 上传文档并完成向量化，确认状态是“已入库”。

6. 测试追问：先问“这份文档主要讲了什么？”，再问“第二点详细说一下”。

7. 正常结果：如果资料足够，assistant 显示“知识库增强回答”，并展示 sources；展开“Agent 调试信息”能看到检索问题和资料判断。

8. 测试 fallback：删除或不索引文档后提问，应显示“普通模型回答”，sources 为空。

9. 验证命令：

```bash
npm run lint
npm run build
```

本阶段我已经执行过这两个命令，均通过。

## 八、面试时我应该怎么说

### 30 秒简短版

在 P10 阶段，我在原有 RAG 优先流程上引入了 LangGraph，把问题改写、知识库检索、资料充分性判断、知识库回答和普通模型兜底拆成了独立节点。这样做不是为了复杂化系统，而是让 RAG 流程更清晰、更可解释，也方便后续扩展。我同时保留了之前的多轮上下文和 SSE 流式输出能力。

### 1 分钟详细版

在 P10 阶段，我做的是轻量 Agentic RAG 改造。原来系统已经支持 RAG 优先、fallback、多轮上下文和 SSE，但流程主要集中在函数里。现在我用 LangGraph 定义了一个共享 state，把流程拆成 QueryRewriteNode、RetrieveNode、JudgeNode、GenerateRagNode 和 FallbackNode。QueryRewriteNode 会结合历史对话改写追问，RetrieveNode 复用已有 LanceDB 检索，JudgeNode 判断资料是否足够回答。如果足够就基于 sources 生成知识库回答，不足就走普通模型兜底。前端也增加了折叠的 Agent 调试信息，可以看到检索问题和判断原因。

### 追问展开版

我这个阶段刻意没有做复杂 Agent，比如没有工具调用、多 Agent 或 LangGraph Server。因为当前项目的重点是把 RAG 闭环做清楚。LangGraph 在这里的价值是把原来“检索、判断、生成、兜底”这些步骤显式化。比如用户追问“第二点详细说一下”时，系统先根据历史消息改写成完整检索问题，再去 LanceDB 召回 chunk，接着让 JudgeNode 判断资料是否足够。这样比单纯依赖相似度阈值更稳，也更容易解释为什么这次用了知识库，或者为什么 fallback。

## 九、面试官可能追问的问题

1. LangGraph 是什么？
   答：它是一个用节点、边和 state 组织流程的工具，适合把 RAG 这种多步骤流程拆清楚。

2. 为什么不用一个普通函数写完整 RAG？
   答：普通函数能做，但流程长了以后可读性差。LangGraph 可以让每个节点职责单一，也方便调试和扩展。

3. Query Rewrite 解决什么问题？
   答：解决多轮追问语义不完整的问题，比如“第二点”需要结合历史才能知道指什么。

4. JudgeNode 为什么有必要？
   答：相似度高不代表资料一定能回答问题，JudgeNode 可以进一步判断资料是否足够。

5. JudgeNode 和相似度阈值有什么区别？
   答：相似度阈值是向量层面的相关性判断，JudgeNode 是语义层面的充分性判断。

6. fallback 什么时候触发？
   答：没有已索引文档、没有 chunk、相似度低、Judge 判断不足或 Agent 流程异常时触发。

7. 这个 Agentic RAG 有没有过度设计？
   答：没有。我只拆了 RAG 必要的五个轻量节点，没有做多 Agent、工具调用、长期记忆等复杂能力。

8. 怎么和 SSE 结合？
   答：LangGraph 先准备 messages 和 meta，最终答案仍由 Provider.stream 逐 token 输出。

9. 怎么和多轮对话结合？
   答：P9 的历史消息会作为 `historyMessages` 进入 state，QueryRewrite、RAG Prompt 和 fallback Prompt 都能使用它。

10. 这个设计怎么降低幻觉？
    答：Prompt 明确要求基于 sources，JudgeNode 会过滤资料不足的情况，fallback 时也明确告诉用户没有使用知识库来源。

## 十、下一阶段要做什么

下一阶段应该进入 P11：登录鉴权与用户数据隔离。

P10 当前已经完成 Agentic RAG 问答流程，但用户仍然是 `mock-user-001`。P11 会把 mock 用户替换成真实用户体系，让不同用户只能访问自己的文档、会话和消息。
