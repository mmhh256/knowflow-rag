# Next.js 智能知识库问答系统

面向文档与多轮对话的智能知识库问答系统。

当前完成阶段：P2 假后端接口与前后端链路。

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
- 聊天页面调用 `/api/chat` 假后端接口
- 后端返回模拟回答和空引用来源

当前尚未接入数据库、人工智能、登录、真实文档上传、检索增强生成、流式输出、流程编排或容器部署。

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
src/app/api/chat     假聊天接口
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
src/lib/rag          后续检索增强生成逻辑目录
src/lib/llm          后续大模型适配目录
src/lib/documents    后续文档解析处理目录
src/lib/vector       后续向量库封装目录
src/store            后续前端状态管理目录
uploads              后续上传文件目录
data/lancedb         后续向量数据目录
```

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需填写：

```bash
copy .env.example .env.local
```

注意：接口密钥、数据库连接串、令牌密钥等敏感信息只能放在服务端环境变量中，不要写入前端组件，也不要添加公开前缀。

## P2 验收

- `npm run dev` 可以启动项目。
- `/`、`/chat`、`/documents`、`/settings` 可以正常打开。
- Tailwind CSS 样式生效。
- `/chat` 输入问题后会请求 `/api/chat`，并展示后端返回的模拟助手回复。
- 空输入不会发送。
- `/documents` 和 `/settings` 只展示静态壳子，不执行真实保存或上传。
