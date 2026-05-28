# Next.js 全栈 RAG 智能问答系统：最终版分阶段开发任务文档

> 这份文档用于交给 Codex 执行开发。请严格按照阶段推进，每次只做当前阶段，不要一次性生成完整项目。  
> 项目第一版只使用在线外部大模型 API 和在线 Embedding API，不做本地模型部署，不接 Ollama，不接 llama.cpp，不做 GPU 检测。  
> 本项目采用 **RAG 优先策略**：用户不需要手动切换“普通对话 / RAG 模式”，系统会优先检索知识库；如果知识库没有可用内容或检索相关性不足，则自动退化为普通 LLM 回答。

---

## 0. 项目定位

项目名称：

**面向文档与多轮对话的 Agentic RAG 智能问答系统**

项目定位：

这是一个偏前端的 Next.js 全栈 AI 项目。系统支持用户上传文档，后端对文档进行解析、分块、向量化入库，用户提问时系统优先从知识库中检索相关内容，再基于检索片段生成答案并展示引用来源。

如果知识库为空、没有已索引文档、没有检索到相关 chunk，或者相似度低于阈值，系统自动退化为普通 LLM 回答，并在前端明确提示本次回答没有使用知识库来源。

第一版目标不是做复杂企业级 Agent 系统，而是先完成一个可运行、可演示、可写进简历的 RAG MVP。后续再逐步加入 SSE 流式输出、多轮对话、模型配置、LangGraph、登录鉴权和 Docker。

---

## 1. 产品核心设计

### 1.1 统一聊天入口，不做手动模式切换

项目不做两个独立模式：

```txt
普通对话模式
RAG 模式
```

项目只保留一个聊天入口：

```txt
用户输入问题
→ 系统自动执行 RAG 优先策略
→ 命中知识库：基于知识库回答 + 引用来源
→ 未命中知识库：退化为普通 LLM 回答 + 明确提示原因
```

这样产品逻辑更简单，用户不需要理解“什么时候该选 RAG”，前端也不需要维护两套聊天逻辑。

### 1.2 RAG 优先策略

统一流程如下：

```txt
用户提问
→ 检查是否存在 indexed 状态的文档
→ 如果没有文档，走 fallback 普通 LLM
→ 如果有文档，生成问题 embedding
→ 从 LanceDB 检索 Top-K chunk
→ 判断检索结果是否达到相似度阈值
→ 如果命中，构造 RAG Prompt
→ 调用在线 Chat API 生成基于知识库的回答
→ 返回 answer + sources + answerMode = "rag"

如果未命中：
→ 构造普通 LLM Prompt
→ 调用在线 Chat API 生成通用回答
→ 返回 answer + sources = [] + answerMode = "fallback"
```

### 1.3 前端必须展示回答依据

每条 AI 消息需要展示回答模式：

```txt
知识库增强回答
普通模型回答
```

如果是知识库增强回答，展示：

```txt
引用来源数量
来源文档名
命中文本片段
相似度分数
chunk 序号 / 页码
```

如果是普通模型回答，展示 fallback 原因：

```txt
当前知识库为空，以下为模型通用回答
知识库未找到强相关内容，以下为模型通用回答
文档尚未完成索引，以下为模型通用回答
检索服务异常，以下为模型通用回答
```

### 1.4 知识库页面必须可见

项目必须提供独立的知识库管理页面 `/documents`，用户可以看到系统里有哪些文档，以及它们是否能用于 RAG。

文档列表至少展示：

```txt
文档名称
文件类型
文件大小
上传时间
解析状态
索引状态
chunk 数量
是否可用于问答
操作：预览 / 重新索引 / 删除
```

这是 RAG 项目的核心体验，不能只做一个聊天框。

### 1.5 设置页面支持模型配置

项目必须提供设置页面 `/settings`。

第一版优先从 `.env.local` 读取模型配置，并在设置页展示当前配置状态：

```txt
LLM 是否已配置
Embedding 是否已配置
当前 LLM Base URL
当前 LLM Model
当前 Embedding Model
连接测试按钮
```

后续版本支持用户在前端填写 API Key，但必须遵守安全规则：

```txt
前端可以收集用户输入的 API Key
前端只能提交给 Next.js 后端
后端负责加密保存或临时使用
前端不能直接请求外部模型 API
前端不能回显完整 API Key
外部模型调用必须永远发生在后端
```

---

## 2. 技术栈

### 2.1 前端技术栈

```txt
Next.js App Router
React
TypeScript
Tailwind CSS
Zustand
React Markdown
```

### 2.2 后端技术栈

```txt
Next.js Route Handlers
Node.js Runtime
TypeScript
Prisma
MySQL
```

### 2.3 AI / RAG 技术栈

```txt
在线外部 Chat API
在线外部 Embedding API
LangChain.js
LanceDB
后期扩展 LangGraph.js
```

### 2.4 文件处理

```txt
pdf-parse
mammoth
xlsx
原生 File / FormData
Node.js fs / path
```

### 2.5 实时通信与工程化

```txt
SSE
ReadableStream
AbortController
Docker
Docker Compose
```

---

## 3. 第一版关键原则

### 3.1 只使用在线 API 模型

第一版不做：

```txt
Ollama
llama.cpp
本地模型下载
GPU 检测
本地模型服务启动
模型文件管理
```

第一版只需要实现：

```txt
Chat Model：在线外部大模型 API
Embedding Model：在线外部 Embedding API
Vector Store：LanceDB
```

### 3.2 API Key 只能在后端使用

正确链路：

```txt
React 页面
  ↓
Next.js Route Handler
  ↓
后端读取 .env.local 或数据库加密配置
  ↓
后端调用外部大模型 API / Embedding API
  ↓
后端把答案返回给前端
```

错误链路：

```txt
React 页面
  ↓
直接请求外部大模型 API
```

### 3.3 先 MVP，再高级功能

开发顺序必须是：

```txt
页面
→ 假接口
→ 在线 Chat API
→ 数据库
→ 知识库页面
→ 文档上传
→ 文档解析
→ 文本分块
→ Embedding
→ LanceDB
→ RAG 优先问答
→ SSE 流式输出
→ 多轮对话
→ 设置页模型配置
→ LangGraph
→ 登录鉴权
→ Docker
```

---

## 4. 推荐目录结构

```txt
rag-next-app
├─ app
│  ├─ page.tsx
│  ├─ chat
│  │  └─ page.tsx
│  ├─ documents
│  │  └─ page.tsx
│  ├─ settings
│  │  └─ page.tsx
│  └─ api
│     ├─ chat
│     │  ├─ route.ts
│     │  └─ stream
│     │     └─ route.ts
│     ├─ conversations
│     │  ├─ route.ts
│     │  └─ [id]
│     │     └─ messages
│     │        └─ route.ts
│     ├─ documents
│     │  ├─ route.ts
│     │  ├─ upload
│     │  │  └─ route.ts
│     │  └─ [id]
│     │     ├─ route.ts
│     │     ├─ chunks
│     │     │  └─ route.ts
│     │     └─ reindex
│     │        └─ route.ts
│     ├─ settings
│     │  ├─ model
│     │  │  └─ route.ts
│     │  └─ test-model
│     │     └─ route.ts
│     └─ auth
│        ├─ login
│        │  └─ route.ts
│        ├─ register
│        │  └─ route.ts
│        ├─ refresh
│        │  └─ route.ts
│        └─ logout
│           └─ route.ts
├─ components
│  ├─ layout
│  │  ├─ AppSidebar.tsx
│  │  └─ TopNav.tsx
│  ├─ chat
│  │  ├─ ChatWindow.tsx
│  │  ├─ ChatInput.tsx
│  │  ├─ MessageBubble.tsx
│  │  ├─ AnswerModeBadge.tsx
│  │  ├─ SourcePanel.tsx
│  │  └─ ConversationList.tsx
│  ├─ documents
│  │  ├─ FileUploader.tsx
│  │  ├─ DocumentList.tsx
│  │  ├─ DocumentDetailDrawer.tsx
│  │  ├─ DocumentStatusBadge.tsx
│  │  └─ ChunkPreviewList.tsx
│  ├─ settings
│  │  ├─ ModelConfigForm.tsx
│  │  ├─ ModelConfigStatus.tsx
│  │  └─ ModelTestPanel.tsx
│  └─ common
│     ├─ Loading.tsx
│     ├─ EmptyState.tsx
│     └─ ErrorState.tsx
├─ lib
│  ├─ db.ts
│  ├─ config.ts
│  ├─ security
│  │  ├─ encrypt.ts
│  │  └─ mask-secret.ts
│  ├─ rag
│  │  ├─ index.ts
│  │  ├─ chunk-text.ts
│  │  ├─ build-rag-prompt.ts
│  │  ├─ build-fallback-prompt.ts
│  │  ├─ retrieve.ts
│  │  ├─ decide-answer-mode.ts
│  │  └─ types.ts
│  ├─ llm
│  │  ├─ chat-provider.ts
│  │  ├─ embedding-provider.ts
│  │  └─ openai-compatible.ts
│  ├─ documents
│  │  ├─ parse-document.ts
│  │  ├─ parse-pdf.ts
│  │  ├─ parse-docx.ts
│  │  ├─ parse-xlsx.ts
│  │  └─ save-upload-file.ts
│  └─ vector
│     ├─ lancedb-client.ts
│     └─ document-vector-store.ts
├─ store
│  ├─ chat-store.ts
│  ├─ document-store.ts
│  └─ settings-store.ts
├─ prisma
│  └─ schema.prisma
├─ uploads
├─ data
│  └─ lancedb
├─ .env.example
├─ Dockerfile
├─ docker-compose.yml
└─ README.md
```

---

## 5. 环境变量设计

```env
# LLM
LLM_PROVIDER=openai-compatible
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.example.com/v1
LLM_MODEL=your_chat_model

# Embedding
EMBEDDING_PROVIDER=openai-compatible
EMBEDDING_API_KEY=your_embedding_api_key
EMBEDDING_BASE_URL=https://api.example.com/v1
EMBEDDING_MODEL=your_embedding_model

# RAG
RAG_TOP_K=5
RAG_SCORE_THRESHOLD=0.72
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=100

# Database
DATABASE_URL="mysql://rag_user:rag_password@localhost:3306/rag_app"

# File
UPLOAD_DIR="./uploads"

# Vector Store
LANCEDB_PATH="./data/lancedb"

# Model Config Encryption
CONFIG_ENCRYPTION_SECRET="replace_me_with_32_bytes_secret"

# Auth
JWT_ACCESS_SECRET="replace_me"
JWT_REFRESH_SECRET="replace_me"
```

注意：

第一版可以只使用 `.env.local` 配置模型。  
后续支持用户在 `/settings` 页面填写 API Key 时，API Key 必须提交到后端，并使用 `CONFIG_ENCRYPTION_SECRET` 加密后保存。

---

## 6. 核心数据类型设计

### 6.1 引用来源类型

```ts
export type SourceChunk = {
  id: string;
  documentId: string;
  fileName: string;
  content: string;
  score: number;
  page?: number;
  chunkIndex?: number;
};
```

### 6.2 回答模式类型

```ts
export type AnswerMode = "rag" | "fallback";

export type RetrievalStatus =
  | "hit"
  | "no_documents"
  | "no_indexed_documents"
  | "no_chunks"
  | "low_score"
  | "error";
```

### 6.3 聊天响应类型

```ts
export type ChatResponse = {
  answer: string;
  answerMode: AnswerMode;
  retrievalStatus: RetrievalStatus;
  fallbackReason?: string;
  sources: SourceChunk[];
};
```

### 6.4 聊天消息类型

```ts
export type MessageRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  answerMode?: AnswerMode;
  retrievalStatus?: RetrievalStatus;
  fallbackReason?: string;
  sources?: SourceChunk[];
  createdAt: string;
};
```

### 6.5 文档类型

```ts
export type DocumentStatus =
  | "uploaded"
  | "parsing"
  | "parsed"
  | "parse_failed"
  | "indexing"
  | "indexed"
  | "index_failed";

export type KnowledgeDocument = {
  id: string;
  fileName: string;
  fileType: "pdf" | "txt" | "md" | "docx" | "xlsx";
  fileSize: number;
  status: DocumentStatus;
  chunkCount: number;
  textLength: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 6.6 文档块类型

```ts
export type DocumentChunk = {
  id: string;
  documentId: string;
  content: string;
  page?: number;
  chunkIndex: number;
  embedding: number[];
  metadata: {
    fileName: string;
    sourceType: "pdf" | "txt" | "docx" | "xlsx" | "md";
  };
};
```

### 6.7 SSE 事件类型

```ts
export type ChatStreamEvent =
  | {
      type: "meta";
      answerMode: AnswerMode;
      retrievalStatus: RetrievalStatus;
      fallbackReason?: string;
      sources: SourceChunk[];
    }
  | {
      type: "token";
      content: string;
    }
  | {
      type: "done";
      messageId?: string;
    }
  | {
      type: "error";
      message: string;
    };
```

---

## 7. Prisma 数据模型建议

第一版可以不做登录，使用固定用户：

```txt
mock-user-001
```

但是数据结构要为后续登录预留 `userId`。

```prisma
model User {
  id            String         @id @default(cuid())
  email         String?        @unique
  name          String?
  passwordHash  String?
  conversations Conversation[]
  documents     Document[]
  modelConfigs  UserModelConfig[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Conversation {
  id        String    @id @default(cuid())
  userId    String
  title     String
  user      User      @relation(fields: [userId], references: [id])
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Message {
  id              String       @id @default(cuid())
  conversationId  String
  role            String
  content         String       @db.Text
  answerMode      String?
  retrievalStatus String?
  fallbackReason  String?      @db.Text
  sources         Json?
  conversation    Conversation @relation(fields: [conversationId], references: [id])
  createdAt       DateTime     @default(now())
}

model Document {
  id           String   @id @default(cuid())
  userId       String
  fileName     String
  fileType     String
  fileSize     Int      @default(0)
  filePath     String
  status       String   @default("uploaded")
  textLength   Int      @default(0)
  chunkCount   Int      @default(0)
  errorMessage String?  @db.Text
  user         User     @relation(fields: [userId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model UserModelConfig {
  id                       String   @id @default(cuid())
  userId                   String
  provider                 String   @default("openai-compatible")
  llmBaseUrl               String?
  llmModel                 String?
  llmApiKeyEncrypted       String?  @db.Text
  embeddingBaseUrl         String?
  embeddingModel           String?
  embeddingApiKeyEncrypted String?  @db.Text
  topK                     Int      @default(5)
  scoreThreshold           Float    @default(0.72)
  user                     User     @relation(fields: [userId], references: [id])
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
}
```

---

# 分阶段开发任务

---

## P0：项目初始化与基础约束

### 目标

创建 Next.js 项目，统一技术栈、目录结构、代码规范和环境变量管理。

### Codex 任务

1. 使用 Next.js App Router 初始化项目。
2. 使用 TypeScript。
3. 配置 Tailwind CSS。
4. 创建基础目录：
   - `components`
   - `components/chat`
   - `components/documents`
   - `components/settings`
   - `lib`
   - `lib/rag`
   - `lib/llm`
   - `lib/documents`
   - `lib/vector`
   - `store`
   - `app/api`
   - `uploads`
   - `data/lancedb`
5. 创建 `.env.example`。
6. 创建 `lib/config.ts`，统一读取环境变量。
7. 添加基础 README。
8. 不要接数据库。
9. 不要接 AI。
10. 不要做登录。

### 验收标准

- 项目可以 `npm run dev` 启动。
- 首页可以正常打开。
- Tailwind 样式生效。
- `.env.example` 存在。
- 目录结构清晰。

---

## P1：前端页面壳子、聊天 UI、知识库 UI、设置 UI 占位

### 目标

先做一个能看的产品壳子，不接后端，不接 AI。

### 页面

```txt
/              首页
/chat          聊天页面
/documents     知识库 / 文档管理页面
/settings      模型设置页面
```

### 聊天页功能

1. 左侧会话列表。
2. 中间消息展示区。
3. 底部输入框。
4. 发送按钮。
5. AI 消息下方预留回答模式区域：
   - 知识库增强回答
   - 普通模型回答
6. 右侧或抽屉形式的引用来源区域，占位即可。
7. 空状态展示。
8. loading 样式占位。

### 知识库页功能

第一阶段只做静态 UI：

1. 上传文档按钮。
2. 文档列表表格。
3. 文档状态 Badge。
4. chunk 数量列。
5. 操作按钮占位：
   - 预览
   - 重新索引
   - 删除
6. 空知识库提示。

### 设置页功能

第一阶段只做静态 UI：

1. LLM 配置状态卡片。
2. Embedding 配置状态卡片。
3. Base URL 输入框占位。
4. Model 输入框占位。
5. API Key 输入框占位。
6. 连接测试按钮占位。
7. 安全提示：API Key 只会提交给后端，前端不会直接调用模型 API。

### 验收标准

- `/chat` 页面完整可见。
- `/documents` 页面能看到知识库管理 UI。
- `/settings` 页面能看到模型配置 UI。
- 聊天页输入问题后，前端模拟追加用户消息和 AI 消息。
- AI 模拟消息可以显示“普通模型回答”或“知识库增强回答”的占位标签。

---

## P2：假后端接口，统一返回 RAG 优先响应结构

### 目标

跑通前后端链路。  
这一阶段仍然不接真实 AI，不接数据库，不接向量库。

### 后端接口

```txt
POST /api/chat
```

请求体：

```ts
{
  question: string;
  conversationId?: string;
}
```

返回体必须使用最终结构：

```ts
{
  answer: string;
  answerMode: "fallback";
  retrievalStatus: "no_documents";
  fallbackReason: "当前知识库为空，以下为模型通用回答";
  sources: [];
}
```

模拟回答：

```txt
这是一个模拟回答：你问的是 xxx
```

### 前端改造

1. 点击发送后调用 `/api/chat`。
2. 展示 loading 状态。
3. 请求成功后展示 AI 回答。
4. AI 消息下方展示 answerMode 和 retrievalStatus。
5. sources 为空时不展示引用来源列表。
6. 请求失败后展示错误提示。
7. 使用 TypeScript 定义请求和响应类型。

### 验收标准

- 前端输入问题后真实请求 `/api/chat`。
- 后端返回统一结构。
- 前端能展示回答模式和 fallback 原因。
- loading 和 error 状态可用。

---

## P3：接入在线 Chat API，实现 fallback 普通 LLM 回答

### 目标

让系统具备最基础的 AI 对话能力。  
这一阶段只做普通 LLM fallback，不做 RAG，不做文档检索。

### 后端要求

1. 创建模型适配层：
   - `lib/llm/chat-provider.ts`
   - `lib/llm/openai-compatible.ts`
2. 后端从 `.env.local` 读取：
   - `LLM_API_KEY`
   - `LLM_BASE_URL`
   - `LLM_MODEL`
3. 后端请求 OpenAI-compatible 格式的在线模型 API。
4. 前端不能接触 API Key。
5. `/api/chat` 返回真实 AI 回答。
6. 返回结构仍然是：

```ts
{
  answer: string;
  answerMode: "fallback";
  retrievalStatus: "no_documents";
  fallbackReason: string;
  sources: [];
}
```

### 模型适配接口建议

```ts
export interface ChatModelProvider {
  generate(messages: { role: "system" | "user" | "assistant"; content: string }[]): Promise<string>;

  stream?(
    messages: { role: "system" | "user" | "assistant"; content: string }[]
  ): AsyncIterable<string>;
}
```

### 验收标准

- 用户在聊天页面提问。
- 后端调用在线 Chat API。
- 页面展示真实 AI 回复。
- API Key 没有暴露在浏览器端。
- 本阶段仍然不接 RAG。

---

## P4：Prisma + MySQL，保存会话、消息和文档元信息

### 目标

让会话和消息可以持久化。  
同时为后续知识库管理预留 Document 表。

### 数据库表

实现：

```txt
User
Conversation
Message
Document
```

第一版不做登录，只使用：

```txt
mock-user-001
```

### 后端接口

```txt
GET  /api/conversations
POST /api/conversations
GET  /api/conversations/[id]/messages
```

### 前端功能

1. 左侧显示会话列表。
2. 新建会话。
3. 点击会话加载历史消息。
4. 发送消息后保存用户消息和 AI 消息。
5. AI 消息需要保存：
   - content
   - answerMode
   - retrievalStatus
   - fallbackReason
   - sources
6. 会话标题可以先用用户第一句话截取。

### 验收标准

- 消息保存到 MySQL。
- 刷新页面后历史消息仍然存在。
- 左侧会话列表能展示真实数据。
- 点击不同会话能切换消息。
- Message 表中能保存 answerMode 和 retrievalStatus。

---

## P5：知识库页面与文档上传解析

### 目标

实现 RAG 的第一步：文档入库。  
这一阶段只做上传、解析和知识库可视化，不做 embedding，不做向量检索。

### 支持文件类型

第一版优先支持：

```txt
PDF
TXT
Markdown
```

后续扩展：

```txt
DOCX
XLSX
```

### 后端接口

```txt
POST   /api/documents/upload
GET    /api/documents
GET    /api/documents/[id]
DELETE /api/documents/[id]
```

### 上传流程

```txt
前端选择文件
→ FormData 上传
→ 后端保存文件到 uploads 目录
→ 后端保存文档元信息到 MySQL，状态 uploaded
→ 后端开始解析文本，状态 parsing
→ 解析成功，状态 parsed，保存 textLength
→ 解析失败，状态 parse_failed，保存 errorMessage
```

### 文档状态

```txt
uploaded      已上传
parsing       解析中
parsed        已解析
parse_failed  解析失败
indexing      向量化中
indexed       已索引，可用于问答
index_failed  向量化失败
```

### 知识库页必须展示

1. 文件名。
2. 文件类型。
3. 文件大小。
4. 文档状态。
5. 文本长度。
6. chunk 数量。
7. 上传时间。
8. 是否可用于问答。
9. 删除按钮。
10. 详情按钮。

### 验收标准

- 可以上传 PDF / TXT / MD。
- 文件保存到本地 `uploads` 目录。
- 文档记录保存到 MySQL。
- 后端能解析出文本。
- 文档列表能显示文件名、类型、大小、状态、文本长度、chunk 数量、创建时间。
- 用户能明确看到文档是否已经可用于 RAG。

---

## P6：文本分块、Embedding 向量化、LanceDB 入库、重新索引

### 目标

把解析后的文档文本切成 chunk，并调用在线 Embedding API 生成向量，写入 LanceDB。

### 分块规则

第一版使用简单规则：

```txt
每块 500 到 800 字
相邻块保留 100 字 overlap
过滤空白内容
过滤过短 chunk
```

### 需要实现的文件

```txt
lib/rag/chunk-text.ts
lib/llm/embedding-provider.ts
lib/vector/lancedb-client.ts
lib/vector/document-vector-store.ts
```

### 后端接口

```txt
POST /api/documents/[id]/reindex
GET  /api/documents/[id]/chunks
```

### Embedding Provider 接口

```ts
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
```

### 流程

```txt
读取已解析文档文本
→ 更新文档状态为 indexing
→ 文本清洗
→ 文本分块
→ 批量调用在线 Embedding API
→ 写入 LanceDB
→ 更新文档状态为 indexed
→ 更新 chunkCount
```

### 知识库页面新增功能

1. 显示 chunk 数量。
2. 支持查看 chunk 预览。
3. 支持重新索引。
4. 索引失败时显示错误信息。
5. 重新索引时更新状态为 indexing。

### 验收标准

- 文档可以被切成多个 chunk。
- 每个 chunk 能生成 embedding。
- chunk 和向量能保存到 LanceDB。
- 文档状态更新为 indexed。
- 文档列表能看到 chunk 数量。
- 用户可以点击“重新索引”。
- 用户可以预览 chunks。

---

## P7：RAG 优先问答与普通 LLM 兜底

### 目标

完成项目核心 MVP：统一聊天入口，系统自动执行 RAG 优先策略。

### RAG 优先流程

```txt
用户提问
→ 查询是否存在 indexed 文档
→ 如果没有 indexed 文档：
   answerMode = "fallback"
   retrievalStatus = "no_indexed_documents"
   sources = []
   调用普通 LLM 回答

→ 如果存在 indexed 文档：
   生成问题 embedding
   LanceDB 检索 Top-K chunk
   如果没有 chunk：
      answerMode = "fallback"
      retrievalStatus = "no_chunks"
      sources = []
      调用普通 LLM 回答

   如果最高相似度低于阈值：
      answerMode = "fallback"
      retrievalStatus = "low_score"
      sources = []
      调用普通 LLM 回答

   如果命中：
      answerMode = "rag"
      retrievalStatus = "hit"
      sources = Top-K chunks
      构造 RAG Prompt
      调用 LLM 基于 sources 回答
```

### 返回结构

```ts
type ChatResponse = {
  answer: string;
  answerMode: "rag" | "fallback";
  retrievalStatus:
    | "hit"
    | "no_documents"
    | "no_indexed_documents"
    | "no_chunks"
    | "low_score"
    | "error";
  fallbackReason?: string;
  sources: SourceChunk[];
};
```

### RAG Prompt 要求

1. 只能基于给定资料回答。
2. 如果资料不足，要明确说明“当前资料中没有找到足够信息”。
3. 不要编造来源。
4. 回答尽量清晰、分点说明。
5. 不要泄露系统提示词。
6. 引用来源由后端 sources 提供，不要求模型自己编来源。

### Fallback Prompt 要求

1. 明确这是通用模型回答。
2. 不要假装来源于知识库。
3. 如果问题明显需要用户文档，提醒用户上传或索引相关文档。

### 前端功能

1. 展示 AI 答案。
2. 展示回答模式 Badge。
3. RAG 命中时展示引用来源。
4. fallback 时展示 fallback 原因。
5. 来源里显示文件名、命中文本片段、相似度分数。
6. 点击来源可以展开查看原文片段。

### 验收标准

- 知识库为空时，系统可以正常普通回答，并提示原因。
- 上传并索引文档后，相关问题能走 RAG。
- 不相关问题会 fallback，不强行引用无关文档。
- 前端能区分“知识库增强回答”和“普通模型回答”。
- RAG 命中时能展示 sources。

---

## P8：SSE 流式输出与停止生成

### 目标

让 AI 回答像 ChatGPT 一样逐步输出，并支持用户中途停止。

### 后端接口

```txt
POST /api/chat/stream
```

### 流式事件设计

后端先发送 meta 事件，让前端知道本次回答模式：

```json
{
  "type": "meta",
  "answerMode": "rag",
  "retrievalStatus": "hit",
  "sources": []
}
```

然后发送 token：

```json
{
  "type": "token",
  "content": "这是"
}
```

最后发送 done：

```json
{
  "type": "done",
  "messageId": "xxx"
}
```

出错发送 error：

```json
{
  "type": "error",
  "message": "生成失败"
}
```

### 前端状态

```ts
type StreamStatus = "idle" | "loading" | "streaming" | "done" | "error" | "aborted";
```

### 需要实现

1. 后端使用 ReadableStream 返回流式内容。
2. 后端在真正输出 token 前先完成检索判断，并发送 meta。
3. 前端根据 meta 先展示回答模式。
4. 前端逐步展示 token。
5. 点击停止按钮后使用 AbortController 取消请求。
6. 处理 error 和 aborted。
7. 生成结束后保存完整 AI 消息。

### 验收标准

- AI 回答不是一次性出现，而是逐步出现。
- 前端能在回答开始时显示本次是 RAG 还是 fallback。
- RAG 模式下 sources 可以在回答前或回答中展示。
- 用户可以点击停止生成。
- 生成完成后消息保存到数据库。
- 页面不会因为流式更新卡顿。

---

## P9：多轮对话上下文

### 目标

让 AI 能理解当前会话上下文，支持连续追问。

### 实现方式

第一版不做复杂 memory，只取最近 N 条消息。

建议规则：

```txt
取当前 conversationId 下最近 6 到 10 条消息
拼进 prompt
再结合 RAG 检索结果生成回答
```

### 普通 fallback 多轮

```txt
最近历史消息
+ 当前用户问题
→ 普通 LLM 回答
```

### RAG 多轮

```txt
最近历史消息
+ 当前用户问题
+ 检索到的知识库片段
→ 基于知识库回答
```

### 需要实现

1. 查询当前会话最近消息。
2. 构造多轮对话 messages。
3. 用户追问时，模型能理解“这个”“上面第二点”等上下文。
4. Zustand 管理当前会话状态。
5. 会话切换时正确加载消息。
6. Message 保存 answerMode、retrievalStatus 和 sources。

### 验收标准

- 同一个会话内可以连续追问。
- AI 能结合最近上下文回答。
- RAG 模式能结合上下文和文档片段。
- 切换会话时上下文不混乱。
- 历史消息和新消息能正确保存。

---

## P10：设置页面与用户模型配置

### 目标

让用户可以在前端配置模型服务，但外部 API 调用仍然只能发生在后端。

### 第一版设置页能力

1. 展示当前 `.env.local` 模型配置状态。
2. 展示：
   - LLM Base URL
   - LLM Model
   - Embedding Base URL
   - Embedding Model
   - API Key 是否已配置
3. 支持连接测试：
   - 测试 Chat API
   - 测试 Embedding API
4. 不回显完整 API Key。

### 第二版设置页能力

支持用户填写：

```txt
LLM Base URL
LLM API Key
LLM Model
Embedding Base URL
Embedding API Key
Embedding Model
Top-K
相似度阈值
```

提交后：

```txt
前端把配置提交给 Next.js 后端
后端校验格式
后端加密保存 API Key
前端只显示 masked key，例如 sk-****abcd
后端调用模型时优先读取用户配置
如果用户未配置，则回退到 .env.local
```

### 后端接口

```txt
GET  /api/settings/model
POST /api/settings/model
POST /api/settings/test-model
```

### 安全要求

1. 前端不能直接请求外部模型 API。
2. 前端不能保存完整 API Key 到 localStorage。
3. 后端不能明文保存 API Key。
4. API Key 返回给前端时只能返回 mask 后的结果。
5. 本地开发可以用 HTTP，正式部署必须用 HTTPS。

### 验收标准

- 设置页能显示模型配置状态。
- 能测试模型连接。
- 用户提交 API Key 后，后端能保存加密结果。
- 前端只能看到 masked key。
- `/api/chat` 能优先使用用户配置调用模型。
- 如果用户没有配置，能回退到 `.env.local`。

---

## P11：LangGraph 改造为 Agentic RAG

### 目标

在基础 RAG 优先策略之上，引入 LangGraph，把流程拆成状态节点。  
这是高级阶段，不影响基础 MVP。

### Agentic RAG 流程

```txt
用户问题
→ 问题改写
→ 检索决策
→ 文档检索
→ 相关性判断
→ RAG 答案生成
→ 答案校验
→ fallback 普通回答
→ 返回最终结果
```

### 节点设计

```txt
rewriteQuestionNode       问题改写
decideRetrieveNode        判断是否需要检索
retrieveNode              文档检索
gradeDocumentsNode        判断文档相关性
generateRagAnswerNode     基于 sources 生成答案
verifyAnswerNode          检查答案是否基于来源
fallbackNode              普通 LLM 兜底
```

### State 设计

```ts
type RagState = {
  question: string;
  conversationId?: string;
  historyMessages: ChatMessage[];
  rewrittenQuestion?: string;
  retrievedChunks: SourceChunk[];
  filteredChunks: SourceChunk[];
  answer?: string;
  answerMode: "rag" | "fallback";
  retrievalStatus: RetrievalStatus;
  fallbackReason?: string;
  sources: SourceChunk[];
  error?: string;
};
```

### 条件分支

1. 如果没有 indexed 文档，走 fallbackNode。
2. 如果检索不到 chunk，走 fallbackNode。
3. 如果相关性评分太低，走 fallbackNode。
4. 如果答案无法基于 sources 支撑，重新生成或兜底。
5. 如果一切正常，返回 RAG answer + sources。

### 验收标准

- RAG 流程不再是一个大函数。
- 每个节点职责清晰。
- 能根据检索结果走不同分支。
- 能在日志里看到每个节点的输入输出。
- 面试时可以讲清楚 Agentic RAG 和普通 RAG 的区别。

---

## P12：登录鉴权与用户数据隔离

### 目标

让项目更像真实产品。  
不同用户只能看到自己的文档、会话、消息和模型配置。

### 功能

1. 注册。
2. 登录。
3. 退出登录。
4. Access Token。
5. Refresh Token。
6. 接口鉴权。
7. 用户数据隔离。

### 接口

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### 数据要求

以下数据必须绑定 userId：

```txt
Document.userId
Conversation.userId
UserModelConfig.userId
Message 通过 Conversation 间接绑定 userId
```

### 验收标准

- 未登录不能访问核心接口。
- 登录后只能看到自己的文档。
- 登录后只能看到自己的会话。
- 登录后只能看到自己的模型配置。
- Token 过期后可以刷新。
- 退出后不能继续访问受保护接口。

---

## P13：Docker Compose 一键启动

### 目标

让项目具备工程化部署能力。  
别人拉下代码后可以通过 Docker Compose 启动项目。

### 需要文件

```txt
Dockerfile
docker-compose.yml
.dockerignore
.env.example
README.md
```

### Docker Compose 服务

至少包含：

```txt
next-app
mysql
```

### 数据卷

需要挂载：

```txt
mysql_data
uploads
lancedb_data
```

### docker-compose.yml 需要支持

1. 启动 Next.js 应用。
2. 启动 MySQL。
3. 挂载上传文件目录。
4. 挂载 LanceDB 数据目录。
5. 通过环境变量连接数据库。
6. 保证容器重启后上传文件和向量数据不丢失。

### 验收标准

- 执行 `docker compose up -d` 可以启动项目。
- MySQL 容器正常运行。
- Next.js 应用可以访问。
- 上传文件不会因为容器重启丢失。
- LanceDB 数据不会因为容器重启丢失。

---

## P14：README、项目截图与简历包装

### 目标

让项目可以展示、可以投简历、可以面试讲解。

### README 必须包含

1. 项目介绍。
2. 技术栈。
3. 功能列表。
4. 系统架构图。
5. RAG 优先策略说明。
6. fallback 普通 LLM 兜底说明。
7. 知识库管理说明。
8. 模型配置说明。
9. 本地启动方式。
10. 环境变量说明。
11. Docker 启动方式。
12. 页面截图。
13. 后续优化方向。

### 项目截图建议

需要准备：

1. 聊天页面。
2. 知识库文档列表页面。
3. 文档上传页面。
4. 文档 chunk 预览页面。
5. 引用来源展示。
6. fallback 普通回答提示。
7. SSE 流式输出效果。
8. 设置页面模型配置。
9. 会话列表。

### 简历描述建议

```txt
面向文档与多轮对话的 Agentic RAG 智能问答系统
技术栈：Next.js、React、TypeScript、Tailwind CSS、Prisma、MySQL、LangChain.js、LanceDB、SSE、Docker

项目介绍：
基于 Next.js 构建的全栈 RAG 智能问答系统，支持用户上传 PDF / Markdown / TXT 文档，系统自动完成文本解析、分块、向量化入库，并在用户提问时优先从知识库检索相关片段生成可追溯答案；当知识库为空或检索相关性不足时，自动退化为普通 LLM 回答并在前端展示原因。

核心亮点：
1. 基于 Next.js Route Handlers 实现聊天问答、文档上传、知识库管理、会话管理和模型配置等服务端接口。
2. 设计 RAG 优先回答链路，通过 indexed 文档检测、Top-K 向量检索、相似度阈值判断实现知识库增强回答与普通 LLM 兜底。
3. 实现知识库管理页面，支持文档上传、解析状态展示、索引状态展示、chunk 数量展示、chunk 预览、重新索引和删除。
4. 设计 answerMode / retrievalStatus / sources 结构化响应，前端可明确展示回答依据、引用来源和 fallback 原因。
5. 基于 SSE 实现大模型回答流式输出，前端使用 AbortController 支持停止生成，并处理 loading、streaming、done、error、aborted 等状态。
6. 使用 Prisma + MySQL 保存会话、消息、文档元信息和模型配置，使用 LanceDB 存储文档 chunk 向量。
7. 设置页面支持在线模型配置和连接测试，API Key 只提交到后端并加密保存，不在前端直接调用外部模型 API。
8. 后期引入 LangGraph 将问题改写、检索、相关性判断、答案生成和兜底处理拆分为状态节点，提升 RAG 流程可控性。
```

---

# 推荐开发优先级

如果时间有限，最低完成到 P8。

```txt
必须完成：
P0 项目初始化
P1 前端页面壳子 + 聊天页 + 知识库页 + 设置页占位
P2 假接口，统一返回 RAG 优先结构
P3 在线 Chat API，完成 fallback 普通 LLM 回答
P4 Prisma + MySQL，保存会话、消息和文档元信息
P5 知识库页面 + 文档上传解析
P6 文本分块 + Embedding + LanceDB + 重新索引
P7 RAG 优先问答 + fallback 普通 LLM 兜底 + sources
P8 SSE 流式输出 + AbortController 停止生成

强烈建议完成：
P9 多轮对话上下文
P10 设置页面与用户模型配置

有时间再做：
P11 LangGraph Agentic RAG
P12 登录鉴权
P13 Docker
P14 README 和简历包装
```

最低可写简历版本：

```txt
Next.js + TypeScript + MySQL + LanceDB + LangChain
实现知识库文档管理、文档上传解析、文本分块、向量检索、RAG 优先问答、普通 LLM 兜底、引用来源展示和 SSE 流式输出。
```

完整加分版本：

```txt
在基础 RAG 优先链路之上，引入 LangGraph 将问题改写、文档检索、相关性判断、答案生成和 fallback 兜底拆分为状态节点，实现具备显式流程控制的 Agentic RAG 闭环。
```

---

# 给 Codex 的总指令

下面这段可以直接复制给 Codex：

```txt
我要做一个 Next.js 全栈 RAG 智能问答系统，项目名称是“面向文档与多轮对话的 Agentic RAG 智能问答系统”。

请严格按照我提供的阶段任务开发，不要一次性完成全部功能。每次只完成当前阶段，并在完成后告诉我：
1. 本阶段做了哪些文件
2. 每个文件的作用
3. 我应该怎么运行和测试
4. 本阶段涉及的 React / Next.js / Node / RAG 知识点
5. 下一阶段应该做什么

第一版项目只使用在线外部大模型 API 和在线外部 Embedding API，不做本地模型，不接 Ollama，不接 llama.cpp，不做 GPU 检测。

项目不做“普通对话 / RAG 模式”的手动切换，而是统一采用 RAG 优先策略：
1. 用户提问后，系统先检查知识库是否存在 indexed 文档。
2. 如果存在可用文档，则生成问题 embedding，从 LanceDB 检索 Top-K chunk。
3. 如果命中高相关内容，则构造 RAG Prompt，基于知识库回答，并返回 sources。
4. 如果知识库为空、没有 indexed 文档、没有检索到 chunk，或者相似度低于阈值，则自动退化为普通 LLM 回答。
5. 前端必须展示 answerMode、retrievalStatus、fallbackReason 和 sources，让用户知道本次回答是否基于知识库。

API Key 必须只在后端使用，不能暴露给前端。前端设置页可以让用户填写 API Key，但只能提交给 Next.js 后端，由后端加密保存或使用；前端不能直接请求外部模型 API，也不能回显完整 API Key。

技术栈：
Next.js App Router + React + TypeScript + Tailwind CSS
Next.js Route Handlers + Node.js Runtime
Prisma + MySQL
LangChain.js + LanceDB
SSE + AbortController
后期扩展 LangGraph.js 和 Docker Compose

开发原则：
先做页面，再做接口，再接在线模型，再做数据库，再做知识库页面和文档上传解析，再做向量化，再做 RAG 优先问答，再做流式输出，最后再做多轮对话、设置页模型配置、Agent、登录和 Docker。

现在请从 P0 开始，只完成 P0，不要提前写后面阶段的代码。
```

---

# 每阶段给 Codex 的短提示

## P0 提示

```txt
请根据项目文档完成 P0：项目初始化与基础约束。
只做项目初始化、目录结构、Tailwind、.env.example、lib/config.ts 和基础 README。
不要接数据库，不要接 AI，不要做登录。
```

## P1 提示

```txt
请完成 P1：前端页面壳子、聊天 UI、知识库 UI、设置 UI 占位。
实现 /、/chat、/documents、/settings 页面。
聊天页需要有会话列表、消息区、输入框、回答模式 Badge 占位、引用来源占位。
知识库页需要有上传按钮、文档列表表格、状态 Badge、chunk 数量列、预览 / 重新索引 / 删除操作占位。
设置页需要有 LLM 和 Embedding 配置状态、Base URL、Model、API Key 输入框占位和连接测试按钮占位。
只用前端 useState 模拟消息，不要接后端。
```

## P2 提示

```txt
请完成 P2：假后端接口，统一返回 RAG 优先响应结构。
实现 POST /api/chat，前端发送 question，后端返回 answer、answerMode、retrievalStatus、fallbackReason 和 sources。
本阶段 answerMode 固定为 fallback，retrievalStatus 固定为 no_documents。
前端需要展示回答模式和 fallback 原因，并处理 loading、error、空输入校验。
不要接外部 AI，不要接数据库。
```

## P3 提示

```txt
请完成 P3：接入在线 Chat API，实现 fallback 普通 LLM 回答。
创建 LLM Provider 适配层，从 .env.local 读取 LLM_API_KEY、LLM_BASE_URL、LLM_MODEL。
后端调用 OpenAI-compatible 格式的在线模型 API。
API Key 不能暴露给前端。
本阶段仍然不做 RAG，不做文档检索，返回结构保持 answerMode=fallback、sources=[]。
```

## P4 提示

```txt
请完成 P4：Prisma + MySQL，保存会话、消息和文档元信息。
设计 User、Conversation、Message、Document 四张表。
第一版不做登录，使用 mock-user-001。
实现会话列表、新建会话、加载历史消息、保存用户消息和 AI 消息。
Message 需要保存 answerMode、retrievalStatus、fallbackReason 和 sources。
```

## P5 提示

```txt
请完成 P5：知识库页面与文档上传解析。
实现 POST /api/documents/upload、GET /api/documents、GET /api/documents/[id]、DELETE /api/documents/[id]。
第一版支持 PDF、TXT、Markdown。
文件保存到 uploads，文档元信息保存到 MySQL，后端解析出文本内容。
知识库页面需要展示文件名、类型、大小、状态、文本长度、chunk 数量、上传时间和是否可用于问答。
暂时不做 embedding 和向量库。
```

## P6 提示

```txt
请完成 P6：文本分块、Embedding 向量化、LanceDB 入库、重新索引。
实现 chunk-text、Embedding Provider、LanceDB Client、DocumentVectorStore。
将解析后的文档文本按 500-800 字切块，100 字 overlap。
调用在线 Embedding API 生成向量，并写入 LanceDB。
实现 POST /api/documents/[id]/reindex 和 GET /api/documents/[id]/chunks。
知识库页面支持 chunk 预览和重新索引。
```

## P7 提示

```txt
请完成 P7：RAG 优先问答与普通 LLM 兜底。
用户提问后，系统先检查是否有 indexed 文档。
有 indexed 文档则生成问题 embedding，从 LanceDB 检索 Top-K chunk，并根据相似度阈值判断是否命中。
命中则走 RAG，返回 answerMode=rag、retrievalStatus=hit、sources。
未命中、无文档、无 chunk 或低相关则走 fallback，返回 answerMode=fallback、retrievalStatus 和 fallbackReason。
前端展示回答模式、fallback 原因和引用来源。
```

## P8 提示

```txt
请完成 P8：SSE 流式输出与停止生成。
实现 POST /api/chat/stream。
后端用 ReadableStream 返回流式内容。
流式事件包含 meta、token、done、error。
meta 事件需要包含 answerMode、retrievalStatus、fallbackReason 和 sources。
前端逐步展示 AI 回答，并使用 AbortController 支持停止生成。
处理 idle、loading、streaming、done、error、aborted 状态。
```

## P9 提示

```txt
请完成 P9：多轮对话上下文。
基于 conversationId 读取最近 6-10 条消息，拼接进 prompt。
RAG 回答时同时结合历史消息和检索到的知识库片段。
fallback 回答时结合历史消息直接调用普通 LLM。
让用户可以在同一个会话里连续追问。
使用 Zustand 管理当前会话和消息状态。
```

## P10 提示

```txt
请完成 P10：设置页面与用户模型配置。
实现 GET /api/settings/model、POST /api/settings/model、POST /api/settings/test-model。
设置页展示当前模型配置状态，支持连接测试。
支持用户填写 LLM Base URL、LLM API Key、LLM Model、Embedding Base URL、Embedding API Key、Embedding Model、Top-K 和相似度阈值。
API Key 提交到后端后必须加密保存，前端只能显示 masked key，不能回显完整 key。
/api/chat 调用模型时优先使用用户配置，没有用户配置则回退到 .env.local。
```

## P11 提示

```txt
请完成 P11：LangGraph Agentic RAG。
使用 LangGraph 将 RAG 优先流程拆成 rewriteQuestion、decideRetrieve、retrieve、gradeDocuments、generateRagAnswer、verifyAnswer、fallback 等节点。
根据检索结果相关性决定继续生成 RAG 答案还是 fallback 普通回答。
```

## P12 提示

```txt
请完成 P12：登录鉴权与用户数据隔离。
实现注册、登录、退出、Access Token、Refresh Token。
核心接口需要鉴权。
用户只能看到自己的文档、会话、消息和模型配置。
```

## P13 提示

```txt
请完成 P13：Docker Compose 一键启动。
添加 Dockerfile、docker-compose.yml、.dockerignore。
Compose 至少包含 next-app 和 mysql。
需要挂载 uploads、LanceDB 数据目录和 MySQL 数据卷。
```

## P14 提示

```txt
请完成 P14：README、项目截图和简历包装。
完善 README，包括项目介绍、技术栈、功能列表、RAG 优先策略、fallback 普通 LLM 兜底、知识库管理、模型配置、启动方式、环境变量、Docker 部署、项目截图和后续优化方向。
同时整理一版适合放进简历的项目描述。
```
