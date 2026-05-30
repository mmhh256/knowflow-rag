# P4 Prisma 和 MySQL 保存会话消息 阶段总结

> 本文档基于当前项目真实代码编写。P4 只完成 Prisma + MySQL 的会话和消息持久化，没有做登录、文档上传、文档解析、Embedding、LanceDB、RAG、SSE、LangGraph 或 Docker。

## 一、本阶段完成了什么

### 1. `package.json`

这个文件记录项目依赖和脚本。本阶段新增了 `prisma`、`@prisma/client`、`@prisma/adapter-mariadb`，并新增脚本：

```json
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate dev"
```

为什么要改：Prisma 负责把 TypeScript 代码和 MySQL 数据库连接起来。`@prisma/adapter-mariadb` 是 Prisma 7 连接 MySQL/MariaDB 需要的运行时适配器。

### 2. `prisma/schema.prisma`

这个文件是数据库模型定义文件，新增了 `User`、`Conversation`、`Message`、`Document` 四张表。

为什么要创建它：P4 要让聊天记录刷新后不丢失，必须把会话和消息保存到数据库。`Document` 表 P4 只建表，为 P5 文档上传保存元信息做准备。

它和其他文件的关系：执行 `npm run prisma:migrate -- --name init` 时，Prisma 会根据这个文件在 MySQL 里建表；执行 `npm run prisma:generate` 后，`src/lib/db.ts` 可以通过 Prisma Client 访问这些表。

### 3. `prisma.config.ts`

Prisma 7 不再支持在 `schema.prisma` 的 datasource 中直接写 `url = env("DATABASE_URL")`。本项目把 CLI 使用的数据库地址放在 `prisma.config.ts`。

为什么要创建它：Prisma migrate 和 generate 需要知道 schema 文件位置和数据库连接地址。

### 4. `src/lib/db.ts`

这个文件创建并导出 Prisma Client 单例：

```ts
export const prisma = globalForPrisma.prisma ?? new PrismaClient(...)
```

为什么要创建它：Route Handler 需要通过 Prisma Client 读写数据库。开发环境热更新会重复加载模块，如果每次都创建一个 Prisma Client，连接会越来越多，所以要做单例。

本阶段我还在这里处理了一个 Prisma 7 + MySQL 的兼容问题：Prisma migrate 需要 `.env` 里使用 `mysql://`，但是 `@prisma/adapter-mariadb` 运行时连接更适合 `mariadb://`，所以我在代码里把运行时连接串做了自动转换。

### 5. `src/lib/auth/mock-user.ts`

这个文件定义：

```ts
export const MOCK_USER_ID = "mock-user-001";
export async function ensureMockUser() {}
```

为什么要创建它：P4 还不做登录，但数据表已经为真实用户做了 `userId` 关系。mock 用户可以让会话、文档先绑定到一个固定用户，后续登录阶段再替换成真实当前用户。

### 6. `src/app/api/conversations/route.ts`

这个文件实现：

- `GET /api/conversations`：读取 mock 用户的会话列表。
- `POST /api/conversations`：创建新会话。

为什么要创建它：前端刷新后需要从数据库重新加载会话列表；用户也需要手动新建会话。

### 7. `src/app/api/conversations/[id]/messages/route.ts`

这个文件实现：

- `GET /api/conversations/[id]/messages`：读取指定会话的历史消息。

为什么要创建它：点击左侧某个会话后，前端需要加载这个会话下的所有消息。接口会先检查会话属于 mock 用户，不存在就返回 404。

### 8. `src/app/api/chat/route.ts`

这个文件在 P3 调用外部模型的基础上增加了数据库保存逻辑：

```txt
校验 question
确保 mock 用户存在
获取或自动创建会话
保存用户消息
调用外部模型
保存 assistant 消息
更新会话 updatedAt
返回 answer + conversationId + fallback 信息
```

为什么要修改它：发送消息是最核心的数据入口，用户消息和 AI 回复都要在这里落库。

### 9. `src/lib/types/chat.ts`

这个文件补充了 P4 需要的类型：

- `AnswerMode`
- `RetrievalStatus`
- `Conversation`
- `ChatRequest.conversationId`
- `ChatResponse.conversationId`
- `ChatMessage.conversationId`
- `answerMode / retrievalStatus / fallbackReason`

为什么要改：前端、接口和数据库之间需要使用一致的数据结构，避免字段名不统一。

### 10. `src/app/chat/page.tsx`

这个文件从单纯聊天页升级为“会话 + 消息”页面。

新增能力：

- 页面加载时请求 `GET /api/conversations`。
- 自动打开最近会话。
- 点击会话时请求历史消息。
- 支持新建会话。
- 发送消息时把 `conversationId` 传给 `/api/chat`。
- 第一次发送没有 `conversationId` 时，后端自动创建会话，前端拿到返回的 `conversationId` 后设为当前会话。

### 11. `src/components/chat/ConversationList.tsx`

这个组件从本地模拟列表改为展示真实数据库会话。

为什么要改：左侧会话列表现在由 `/api/conversations` 返回，不再写死。

### 12. `src/components/layout/AppShell.tsx` 和 `src/components/layout/AppSidebar.tsx`

这两个文件增加了 `sidebarContent` / `children` 支持，让 `/chat` 页面可以把真实会话列表放进左侧栏。

为什么要改：P4 要在侧边栏展示真实会话，而其他页面仍然可以复用同一个基础布局。

### 13. `src/components/chat/MessageBubble.tsx`

这个组件补充了：

- ISO 时间格式化展示。
- assistant 消息展示 `普通模型回答` 和 `fallbackReason`。

为什么要改：P4 的消息来自数据库，`createdAt` 是 ISO 字符串；同时 `answerMode` 和 `fallbackReason` 是后续 RAG 需要的重要字段。

## 二、本阶段的完整开发思路

第一步，先安装 Prisma 依赖。  
P4 的核心是数据库持久化，必须先有 Prisma CLI、Prisma Client 和 MySQL driver adapter。

第二步，设计数据库模型。  
因为会话和消息的关系会影响后续所有接口，如果表关系没设计好，后面保存消息、加载历史、多轮对话都会很乱。

第三步，创建 Prisma Client 单例。  
Route Handler 需要用它读写数据库。开发环境热更新会重复加载模块，所以要用全局单例避免重复连接。

第四步，创建 mock 用户工具。  
P4 不做登录，但 Conversation 和 Document 都需要 userId。先固定 `mock-user-001`，可以让数据结构提前贴近真实产品。

第五步，实现会话接口。  
前端需要加载会话列表、新建会话、加载历史消息，所以先把这些基础接口做好。

第六步，改造 `/api/chat`。  
聊天接口在 P3 已经能调用外部模型，P4 在这个基础上增加消息保存：先存用户问题，再调用模型，再存 AI 回复。

第七步，改造前端 `/chat`。  
前端从 `useState` 临时消息升级为“从数据库加载会话和消息”。刷新页面后，数据能重新加载回来。

P4 和后续阶段的关系：

- P5 会使用 `Document` 表保存文档元信息。
- P7 会把真实 `sources` 保存到 Message 表。
- P9 会从 Message 表读取最近历史消息，拼成多轮上下文。

## 三、逐个知识点讲解

### 1. MySQL 是什么

MySQL 是关系型数据库，用表保存结构化数据。本项目用它保存用户、会话、消息和文档元信息。

### 2. Prisma 是什么

Prisma 是 TypeScript 里的数据库工具。你不用手写很多 SQL，可以通过 `prisma.conversation.findMany()` 这种方式查询数据库。

### 3. Prisma Client 是什么

Prisma Client 是由 schema 生成的数据库访问对象。本项目在 `src/lib/db.ts` 中导出 `prisma`，Route Handler 通过它读写 MySQL。

### 4. `schema.prisma` 是什么

`schema.prisma` 是数据库模型说明书。本项目在里面定义 `User`、`Conversation`、`Message`、`Document`。

### 5. model 是什么

一个 `model` 通常对应数据库里的一张表。例如：

```prisma
model Conversation {
  id String @id @default(cuid())
  title String
}
```

表示数据库里会有一张 Conversation 表。

### 6. 一对多关系是什么

一个 User 可以有多个 Conversation，一个 Conversation 可以有多条 Message。  
这就是一对多关系。

### 7. User / Conversation / Message / Document 为什么这样设计

User 用来表示用户。  
Conversation 表示一次聊天会话。  
Message 表示会话里的每一条消息。  
Document 表示知识库文档元信息，P4 先建表，P5 再使用。

### 8. 主键 id 是什么

主键是每条记录的唯一标识。比如每个会话都有自己的 `id`，前端点击某个会话时，就是通过这个 `id` 加载消息。

### 9. 外键 userId / conversationId 是什么

`Conversation.userId` 表示这个会话属于哪个用户。  
`Message.conversationId` 表示这条消息属于哪个会话。

### 10. migration 是什么

migration 是数据库结构变更记录。执行 `prisma migrate dev` 后，Prisma 会根据 `schema.prisma` 创建或修改数据库表。

### 11. 为什么要保存会话和消息

P1-P3 的消息只在前端内存里，刷新页面就没了。P4 保存到 MySQL 后，刷新页面可以重新从数据库加载。

### 12. 为什么要用 mock 用户

因为 P4 不做登录，但数据结构需要 userId。mock 用户让我们先完成数据持久化，后续登录阶段再替换成真实用户。

### 13. Route Handler 如何读写数据库

以 `GET /api/conversations` 为例：

```ts
const conversations = await prisma.conversation.findMany({
  where: { userId: MOCK_USER_ID },
  orderBy: { updatedAt: "desc" },
});
```

Route Handler 运行在服务端，可以安全访问数据库和环境变量。

### 14. 前端如何加载会话列表

`src/app/chat/page.tsx` 首次加载时请求：

```ts
request<ConversationsResponse>("/api/conversations")
```

拿到结果后保存到 `conversations` 状态，再交给 `ConversationList` 展示。

### 15. 前端如何加载历史消息

点击会话时调用：

```ts
request<MessagesResponse>(`/api/conversations/${conversationId}/messages`)
```

返回的消息按 `createdAt` 正序排列，前端直接展示。

### 16. 发送消息后数据怎么保存

前端发送：

```ts
request<ChatResponse>("/api/chat", {
  method: "POST",
  body: { question, conversationId },
})
```

后端保存用户消息，调用模型，再保存 assistant 消息。

### 17. 刷新后为什么数据不会丢失

因为数据已经保存到 MySQL。刷新只是清空前端内存，页面重新请求接口后会从数据库拿回会话和消息。

## 四、关键代码逐段讲解

### 1. Prisma Client 单例

位置：`src/lib/db.ts`

```ts
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(getPrismaAdapterUrl()),
  });
```

这段代码解决的问题：创建数据库访问对象，并在开发环境复用同一个实例。

关键变量：

- `PrismaClient`：Prisma 生成的数据库客户端。
- `PrismaMariaDb`：Prisma 7 连接 MySQL 的 driver adapter。
- `globalForPrisma`：开发环境缓存 Prisma Client 的地方。
- `getPrismaAdapterUrl()`：把 `.env` 中给 Prisma CLI 使用的 `mysql://` 转成运行时 adapter 使用的 `mariadb://`。

### 2. mock 用户

位置：`src/lib/auth/mock-user.ts`

```ts
export const MOCK_USER_ID = "mock-user-001";

export async function ensureMockUser() {
  return prisma.user.upsert({
    where: { id: MOCK_USER_ID },
    update: {},
    create: { id: MOCK_USER_ID, name: "本地演示用户" },
  });
}
```

这段代码解决的问题：P4 没有登录，但数据库关系需要用户。

`upsert` 的意思是：有就更新，没有就创建。

### 3. 读取会话列表

位置：`src/app/api/conversations/route.ts`

```ts
const conversations = await prisma.conversation.findMany({
  where: { userId: MOCK_USER_ID },
  orderBy: { updatedAt: "desc" },
});
```

这段代码解决的问题：只读取当前 mock 用户的会话，并把最新会话排在前面。

### 4. 读取历史消息

位置：`src/app/api/conversations/[id]/messages/route.ts`

```ts
const messages = await prisma.message.findMany({
  where: { conversationId: id },
  orderBy: { createdAt: "asc" },
});
```

这段代码解决的问题：按创建时间从早到晚展示消息，聊天记录才不会乱序。

### 5. `/api/chat` 保存消息

位置：`src/app/api/chat/route.ts`

```ts
await prisma.message.create({
  data: {
    conversationId: conversation.id,
    role: "user",
    content: question,
  },
});

const answer = await chatProvider.generate(messages);

await prisma.message.create({
  data: {
    conversationId: conversation.id,
    role: "assistant",
    content: answer,
    sources: [],
    answerMode: "fallback",
    retrievalStatus: "no_documents",
    fallbackReason: FALLBACK_REASON,
  },
});
```

数据流动：

```txt
前端输入 question
→ /api/chat
→ 保存 user 消息
→ 调用外部模型生成 answer
→ 保存 assistant 消息
→ 返回给前端展示
```

初学者容易看不懂的点：P4 保存了历史消息，但调用模型时还没有拼接历史消息，多轮上下文会在 P9 做。

### 6. 前端发送消息时传 conversationId

位置：`src/app/chat/page.tsx`

```ts
const requestBody: ChatRequest = {
  question,
  conversationId: activeConversationId,
};
```

这段代码解决的问题：后端知道这条消息应该保存到哪个会话。如果没有 `activeConversationId`，后端会自动创建新会话。

## 五、本阶段的重难点

### 1. 为什么需要数据库，而不是继续用 useState

`useState` 只存在于浏览器内存中，刷新页面就没了。数据库可以长期保存数据。

### 2. 为什么要先设计表关系

因为会话、消息、用户之间有关系。如果不先设计清楚，后面写接口时就不知道消息该归属到哪里。

### 3. 为什么一个用户有多个会话

真实产品里用户会围绕不同主题聊天，比如“产品问答”“文档理解”。所以一个用户对应多个 Conversation。

### 4. 为什么一个会话有多条消息

一次聊天会有多轮输入和回复，所以一个 Conversation 下有多条 Message。

### 5. 为什么 Message 要保存 role

role 用来区分消息是谁发的。前端靠它决定用户消息靠右、助手消息靠左。

### 6. 为什么 Message 要预留 sources

P4 还没有 RAG，所以 sources 为空。P7 做 RAG 后，assistant 消息会保存引用来源，前端可以展示依据。

### 7. 为什么没有 conversationId 时要自动创建会话

用户第一次进入聊天页可能直接输入问题。如果要求用户必须先点新建，会增加操作。后端自动创建会话，体验更自然。

### 8. 为什么 P4 不做多轮上下文

P4 的目标是保存历史，不是让模型读取历史。多轮上下文需要控制历史消息数量、token 长度和 prompt 结构，会在 P9 单独做。

## 六、本阶段容易出错的地方

1. MySQL 没启动：先确认数据库服务正在运行。
2. `DATABASE_URL` 写错：检查用户名、密码、端口、数据库名。
3. 修改 `.env.local` 后没重启项目：环境变量通常需要重启才生效。
4. Prisma migrate 没执行：表不存在时接口会报错。
5. 没有生成 Prisma Client：执行 `npm run prisma:generate`。
6. 关系字段写错：`Conversation.userId` 指向 User，`Message.conversationId` 指向 Conversation。
7. 查询消息没有按 `createdAt` 排序：消息展示会乱。
8. `conversationId` 不存在时没有处理：本项目会返回 404。
9. 消息保存成功但前端状态没更新：发送成功后要追加 assistant 消息并刷新会话列表。
10. 刷新后没有重新加载会话列表：`/chat` 首次加载会请求 `/api/conversations`。
11. mock 用户没有提前创建：本项目每次接口都会先调用 `ensureMockUser()`。

## 七、我实际遇到的问题与解决过程

这一节是我在 P4 阶段真实遇到的排障过程。它比“正常开发步骤”更接近实际项目经验，因为数据库接入经常不是一次就通。

### 1. 我一开始以为只是 MySQL 没启动

我在页面里看到的第一个错误是：

```txt
pool timeout: failed to retrieve a connection from pool
```

我一开始判断这是数据库连接池拿不到连接，所以先检查 MySQL 服务有没有启动。我在 Windows 里通过：

```cmd
sc query state= all | findstr /I mysql
net start MySQL80
netstat -ano | findstr :3306
```

确认了 MySQL80 服务已经启动，而且 3306 端口处于 `LISTENING` 状态。

这个过程让我明确了一点：端口启动只能说明 MySQL 服务在监听，不代表账号、密码、数据库名、认证方式和 Prisma 配置一定正确。

### 2. 我遇到了 Prisma CLI 读不到 `DATABASE_URL`

我执行：

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

时遇到：

```txt
Cannot resolve environment variable: DATABASE_URL
```

原因是 Next.js 会自动读取 `.env.local`，但 Prisma 7 的 `prisma.config.ts` 不一定会自动读取 Next.js 的 `.env.local`。所以我在 `prisma.config.ts` 里主动加载：

```ts
if (existsSync(".env")) {
  loadEnvFile(".env");
}

if (existsSync(".env.local")) {
  loadEnvFile(".env.local");
}
```

这样 Prisma CLI 执行 generate / migrate 时就能读到 `DATABASE_URL`。

### 3. 我遇到了 `mysql://` 和 `mariadb://` 的冲突

后来我把连接串改成 `mariadb://`，运行时代码可以接近成功，但执行 Prisma migrate 又报：

```txt
P1013: The provided database string is invalid. The scheme is not recognized in database URL.
```

我后来理解到：`schema.prisma` 里 datasource provider 是 `mysql`，所以 Prisma CLI 期待 `.env` 里的连接串是：

```env
DATABASE_URL="mysql://..."
```

但是项目使用的 Prisma 7 driver adapter 是 `@prisma/adapter-mariadb`，运行时底层驱动更适合：

```txt
mariadb://...
```

最终我的解决方式是：`.env` 和 `.env.local` 统一保留 `mysql://`，让 Prisma CLI 可以 migrate；在 `src/lib/db.ts` 里运行时自动转换：

```ts
return databaseUrl.replace(/^mysql:\/\//, "mariadb://");
```

这样 CLI 和运行时就不会互相打架。

### 4. 我遇到了 MySQL 8 的 RSA 公钥问题

连接 MySQL 时又出现：

```txt
ER_CANNOT_RETRIEVE_RSA_KEY
RSA public key is not available client side
```

这是 MySQL 8 默认认证方式带来的问题。解决方式是在连接串后面加：

```txt
allowPublicKeyRetrieval=true
```

最终我的连接串变成：

```env
DATABASE_URL="mysql://root:Root%40123456@localhost:3306/rag_app?allowPublicKeyRetrieval=true"
```

### 5. 我遇到了密码里有 `@` 的 URL 转义问题

我的 MySQL 密码是：

```txt
Root@123456
```

但是 `@` 在数据库 URL 里有特殊含义，它用来分隔“账号密码”和“主机地址”。如果我直接写：

```env
DATABASE_URL="mysql://root:Root@123456@localhost:3306/rag_app"
```

URL 会被解析错。正确写法是把 `@` 转义成 `%40`：

```env
DATABASE_URL="mysql://root:Root%40123456@localhost:3306/rag_app?allowPublicKeyRetrieval=true"
```

这个问题非常隐蔽，因为端口是通的，MySQL 也启动了，但连接还是会失败。

### 6. 我发现 `rag_user` 用户权限或密码不对

我最开始按示例用了：

```env
DATABASE_URL="mysql://rag_user:rag_password@localhost:3306/rag_app"
```

但实际连接时报：

```txt
Access denied for user 'rag_user'@'localhost'
```

说明这个用户不存在、密码不对，或者没有 `rag_app` 数据库权限。为了先完成 P4，我改成使用本机可用的 root 账号连接。后续如果要更规范，可以重新创建专门的 `rag_user` 并授权。

### 7. 我成功执行了 Prisma migration

最终配置正确后，我执行：

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

成功看到：

```txt
Applying migration `20260530071945_init`
Your database is now in sync with your schema.
```

我还确认 MySQL 里已经有这些表：

```txt
_prisma_migrations
conversation
document
message
user
```

这说明 P4 的数据库表结构已经真正落到 MySQL 里了。

### 8. 数据库通了以后，我又遇到了 DeepSeek 网络超时

数据库问题解决后，页面里又出现：

```txt
连接外部模型服务失败：Connect Timeout Error
api.deepseek.com:443 timeout
```

这个问题已经不是 MySQL，而是后端访问 DeepSeek API 超时。也就是说，用户消息可能已经保存到数据库了，但调用外部模型生成 assistant 回复失败。

我判断它属于 P3 外部模型网络问题，常见原因是当前网络访问 DeepSeek 不稳定、需要代理、防火墙拦截，或者后端 Node 没走系统代理。这个问题和 P4 数据库持久化是两条链路：

```txt
数据库链路：Next.js -> Prisma -> MySQL
模型链路：Next.js -> DeepSeek API
```

排查时不能混在一起看。

### 9. 这次排障我学到的经验

我这次最大的收获是：数据库接入失败时，不能只看页面上的一句错误，要分层排查。

我的排查顺序是：

```txt
MySQL 服务是否启动
→ 3306 端口是否监听
→ DATABASE_URL 是否被 Prisma CLI 读到
→ URL 协议是否符合 Prisma CLI
→ 运行时 adapter 是否能识别连接串
→ 用户名密码是否正确
→ 密码特殊字符是否需要转义
→ MySQL 8 是否需要 allowPublicKeyRetrieval
→ migrate 是否真正创建了表
→ 页面错误是否其实来自外部模型 API
```

这段经历比单纯写代码更重要，因为真实项目里数据库、环境变量、驱动版本和网络经常会一起出问题。

## 八、我应该怎么运行和测试

### 1. 准备 MySQL

确保本地 MySQL 已启动，并创建数据库：

```sql
CREATE DATABASE rag_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 配置 `.env.local`

```env
DATABASE_URL="mysql://root:Root%40123456@localhost:3306/rag_app?allowPublicKeyRetrieval=true"
```

说明：我的 MySQL root 密码是 `Root@123456`，URL 里的 `@` 不能直接写，需要转义成 `%40`。如果不转义，连接串会被错误解析。

同时保留 P3 的模型配置：

```env
LLM_PROVIDER=deepseek
LLM_API_KEY=你的真实 key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash
```

### 3. 执行 Prisma 命令

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

### 4. 启动项目

```bash
npm run dev
```

### 5. 打开页面

```txt
http://localhost:3000/chat
```

### 6. 测试新建会话

点击左侧“新建”，会话列表会出现“新会话”。也可以不点新建，直接发送第一条消息，后端会自动创建会话。

### 7. 测试发送消息

输入一个问题并发送。正常结果：

- 页面出现用户消息。
- 后端调用外部模型。
- 页面出现 AI 回复。
- 数据库 Message 表出现 user 和 assistant 两条记录。

### 8. 测试刷新后数据还在

刷新 `/chat` 页面，左侧会话列表应该仍然存在。点击会话后，历史消息应该重新加载出来。

### 9. 怎么在数据库里查看记录

可以使用 MySQL 客户端执行：

```sql
SELECT * FROM User;
SELECT * FROM Conversation;
SELECT * FROM Message;
```

也可以使用：

```bash
npx prisma studio
```

### 10. 如果报错优先检查哪里

- MySQL 是否启动。
- `.env.local` 是否有 `DATABASE_URL`。
- `DATABASE_URL` 用户名密码是否正确。
- 是否执行了 migrate。
- 修改环境变量后是否重启项目。
- 外部模型 API 是否仍然能正常调用。

## 九、面试时我应该怎么说

### 30 秒简短版

在 P4 阶段，我用 Prisma 和 MySQL 把聊天会话和消息保存了下来。我设计了 User、Conversation、Message、Document 四张表，先用固定 mock 用户代替登录。过程中我也解决了 Prisma 7 环境变量读取、MySQL 连接串协议、MySQL 8 公钥认证和密码特殊字符转义这些问题。最后发送消息时，后端会保存用户问题，调用外部模型，再保存 AI 回复，刷新后也能重新加载历史消息。

### 1 分钟详细版

在这个阶段，我主要解决的是聊天记录持久化问题。P1 到 P3 的消息都在前端状态里，刷新就没了，所以我引入 Prisma + MySQL。数据库上我设计了 User、Conversation、Message、Document 四张表：一个用户可以有多个会话，一个会话可以有多条消息，Document 表先为后续知识库上传做准备。因为当前阶段还不做登录，所以我用 `mock-user-001` 作为固定用户。实现过程中我遇到了不少数据库配置问题，比如 Prisma 7 的配置不再直接从 schema 里读 url、Prisma CLI 和运行时 adapter 对连接串协议要求不同、MySQL 8 需要 `allowPublicKeyRetrieval`，以及密码里有 `@` 必须写成 `%40`。这些问题解决后，我实现了会话列表、新建会话、加载历史消息，并改造 `/api/chat` 保存用户消息和 assistant 消息。

### 追问展开版

如果继续展开，我会说 P4 的重点不是让模型变聪明，而是把数据链路打稳。这个阶段我不仅写了表和接口，还实际排查了数据库落地中的问题：先确认 MySQL 服务和 3306 端口，再确认 Prisma CLI 能不能读到 `DATABASE_URL`，再处理 `mysql://` 和 `mariadb://` 的兼容，最后解决 MySQL 8 RSA 公钥和密码转义问题。现在 Message 表里已经预留了 `sources`、`answerMode`、`retrievalStatus` 和 `fallbackReason`，虽然 P4 的 sources 还是空，但 P7 做 RAG 时可以直接把引用来源保存进去。P4 也没有把历史消息传给模型，因为多轮上下文需要单独设计 token 控制和历史截断，会在 P9 做。

## 十、面试官可能追问的问题

### 1. 为什么要用 Prisma？

可以回答：Prisma 提供类型安全的数据库访问方式，能根据 schema 生成 Client，减少手写 SQL 和字段写错的问题。

### 2. Prisma 和 MySQL 是什么关系？

可以回答：MySQL 是真实存数据的数据库，Prisma 是 TypeScript 代码访问 MySQL 的工具。

### 3. User、Conversation、Message 是什么关系？

可以回答：一个 User 有多个 Conversation，一个 Conversation 有多条 Message。Message 通过 `conversationId` 找到所属会话。

### 4. 为什么 Message 要有 role 字段？

可以回答：role 用来区分 user 和 assistant，前端展示样式和后续构造多轮上下文都依赖它。

### 5. 为什么要保存 sources？

可以回答：后续 RAG 回答需要保存引用来源，让用户知道答案基于哪些文档片段。

### 6. 为什么现在 sources 还是空？

可以回答：P4 只做会话和消息保存，还没有知识库检索，所以没有真实来源。

### 7. mock 用户后面怎么替换成真实登录？

可以回答：后续登录后从 token/session 获取真实 userId，把 `MOCK_USER_ID` 替换成当前用户 id，并在接口里做鉴权。

### 8. 刷新页面后数据为什么不会丢？

可以回答：因为会话和消息已经保存到 MySQL，刷新后前端重新调用接口加载。

### 9. 如果会话很多，怎么分页？

可以回答：可以在 `GET /api/conversations` 加 `limit`、`cursor` 或 `page` 参数，按 `updatedAt` 分页查询。

### 10. 如果消息很多，后面怎么优化？

可以回答：可以只加载最近 N 条消息，向上滚动再分页加载历史消息。

### 11. P4 和后面的多轮对话有什么关系？

可以回答：P4 先把历史消息保存下来，P9 才能读取最近几条消息拼进 prompt。

### 12. P4 和后面的 RAG 有什么关系？

可以回答：P4 的 Message 表已经预留了 `sources` 和回答模式字段，P7 RAG 命中后可以把引用来源保存下来。

### 13. 你在 P4 接数据库时遇到过什么实际问题？

可以回答：我遇到过几个实际问题。第一，Prisma CLI 一开始读不到 `.env.local` 里的 `DATABASE_URL`，所以我在 `prisma.config.ts` 里主动加载 `.env` 和 `.env.local`。第二，Prisma migrate 需要 `mysql://`，但运行时 adapter 更适合 `mariadb://`，所以我在 `db.ts` 里做了运行时转换。第三，MySQL 8 认证需要 `allowPublicKeyRetrieval=true`。第四，我的密码里有 `@`，必须转义成 `%40`。这些都解决后 migration 才真正成功。

### 14. 为什么数据库通了，页面还可能报 DeepSeek 超时？

可以回答：因为这是两条链路。数据库链路是 Next.js 到 MySQL，模型链路是 Next.js 到 DeepSeek。数据库成功只代表消息可以保存，不代表外部模型一定能访问。如果 DeepSeek 网络超时，可能是代理、防火墙或当前网络环境问题。

## 十一、下一阶段要做什么

下一阶段进入 P5：知识库文档上传与文档解析。

P4 当前已经创建了 `Document` 表，但还没有上传接口，也没有解析文件。P5 会使用这张表保存文档元信息，例如文件名、文件类型、文件大小、保存路径、解析状态和 chunk 数量。等 P5 完成后，知识库页面就不再只是静态壳子，而是能看到真实上传过的文档记录。
