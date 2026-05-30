# Next.js 智能知识库问答系统

面向文档与多轮对话的智能知识库问答系统。

当前完成阶段：P4 Prisma + MySQL，保存会话和消息。

## 当前范围

当前已完成前端基础页面：

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- 基础目录结构
- `.env.example`
- `src/lib/config.ts`
- 首页 `/`
- 聊天页面 `/chat`
- 知识库页面 `/documents`
- 设置页面 `/settings`
- 聊天页面通过请求封装调用 `/api/chat`
- 后端通过 OpenAI-compatible Provider 调用外部 Chat API
- 使用 Prisma + MySQL 保存会话和消息
- 刷新页面后可从会话列表重新加载历史消息

当前尚未接入登录、真实文档上传、检索增强生成、流式输出、流程编排或容器部署。

## 本地运行

```bash
npm install
npm run dev
```

启动后访问：

```txt
http://localhost:3000
```

## 常用命令

```bash
npm run dev
npm run build
npm run lint
```

## 目录说明

```txt
src/app              Next.js 页面与后续接口路由
src/app/chat         聊天页面
src/app/api/chat     聊天接口，后端调用外部 Chat API
src/app/api/conversations 会话列表和新建会话接口
src/app/documents    知识库页面
src/app/settings     设置页面
src/components       后续界面组件目录
src/components/chat  聊天界面组件
src/components/common 通用空状态和加载组件
src/components/layout 应用侧边栏和页面外壳
src/components/documents  后续知识库文档界面组件目录
src/components/settings   后续模型设置界面组件目录
src/lib              服务端与共享工具目录
src/lib/config.ts    环境变量统一读取入口
src/lib/db.ts        Prisma Client 单例
src/lib/auth/mock-user.ts P4 固定 mock 用户
src/lib/rag          后续检索增强生成逻辑目录
src/lib/llm          大模型 Provider 适配目录
src/lib/documents    后续文档解析处理目录
src/lib/vector       后续向量库封装目录
src/store            后续前端状态管理目录
uploads              后续上传文件目录
data/lancedb         后续向量数据目录
prisma/schema.prisma Prisma 数据库模型
```

## 环境变量

复制 `.env.example` 为 `.env.local` 后填写真实模型配置：

```bash
copy .env.example .env.local
```

P3 至少需要配置：

```env
LLM_PROVIDER=openai-compatible
LLM_API_KEY=你的真实_API_Key
LLM_BASE_URL=https://api.example.com/v1
LLM_MODEL=你的聊天模型名称
```

如果你使用 DeepSeek，可以这样配置：

```env
LLM_PROVIDER=deepseek
LLM_API_KEY=你的_DeepSeek_API_Key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash
```

如果你的 DeepSeek 控制台给的是其他模型名，例如 `deepseek-v4-pro`，请把 `LLM_MODEL` 改成控制台提供的真实模型名。

注意：接口密钥、数据库连接串、令牌密钥等敏感信息只能放在服务端环境变量中，不要写入前端组件，也不要添加公开前缀。

P4 还需要配置 MySQL：

```env
DATABASE_URL="mysql://rag_user:rag_password@localhost:3306/rag_app"
```

配置后执行：

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## P4 验收

- `npm run dev` 可以启动项目。
- `/`、`/chat`、`/documents`、`/settings` 可以正常打开。
- Tailwind CSS 样式生效。
- `/chat` 输入问题后会请求 `/api/chat`，后端调用外部模型并返回真实 AI 回复。
- 会话和消息保存到 MySQL。
- 刷新页面后，左侧会话列表仍然存在，点击会话可以加载历史消息。
- 空输入不会发送。
- 浏览器 Network 中只能看到请求自己的 `/api/chat`，看不到外部模型 API Key。
- 如果 `.env.local` 缺少 `LLM_API_KEY`、`LLM_BASE_URL` 或 `LLM_MODEL`，页面会展示明确错误。
- `/documents` 和 `/settings` 只展示静态壳子，不执行真实保存或上传。
