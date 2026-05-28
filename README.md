# Next.js Agentic RAG Knowledge Base

面向文档与多轮对话的 Agentic RAG 智能知识库问答系统。

当前完成阶段：P0 项目初始化与基础约束。

## 当前范围

本阶段只完成工程基础：

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- 基础目录结构
- `.env.example`
- `src/lib/config.ts`

本阶段尚未接入数据库、AI、登录、文档上传、RAG、SSE、LangGraph 或 Docker。

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
src/app              Next.js App Router 页面与后续 API 路由
src/components       后续 UI 组件目录
src/components/chat  后续聊天 UI 组件目录
src/components/documents  后续知识库文档 UI 组件目录
src/components/settings   后续模型设置 UI 组件目录
src/lib              服务端与共享工具目录
src/lib/config.ts    环境变量统一读取入口
src/lib/rag          后续 RAG 逻辑目录
src/lib/llm          后续大模型适配目录
src/lib/documents    后续文档解析处理目录
src/lib/vector       后续向量库封装目录
src/store            后续前端状态管理目录
uploads              后续上传文件目录
data/lancedb         后续 LanceDB 数据目录
```

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需填写：

```bash
copy .env.example .env.local
```

注意：API Key、数据库连接串、JWT Secret 等敏感信息只能放在服务端环境变量中，不要写入前端组件，也不要添加 `NEXT_PUBLIC_` 前缀。

## P0 验收

- `npm run dev` 可以启动项目。
- 首页可以正常打开。
- Tailwind CSS 样式生效。
- `.env.example` 存在。
- 基础目录结构清晰。
