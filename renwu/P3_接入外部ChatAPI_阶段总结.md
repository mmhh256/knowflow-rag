# P3 接入外部 Chat API 阶段总结

> 本文档基于当前项目真实代码编写。P3 只完成“后端调用外部大模型 API，实现普通 AI 对话”，没有开发 P4 数据库、P7 RAG、P8 SSE、登录或 Docker。

## 一、本阶段完成了什么

### 1. `src/lib/config.ts`

这个文件负责统一读取环境变量。本阶段在原有 `appConfig` 基础上新增了 `serverConfig` 和 `getValidatedServerLlmConfig()`。

为什么要修改它：P3 开始要读取 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`。这些配置必须集中管理，不能在各个接口文件里到处写 `process.env`。

它和其他文件的关系：`src/lib/llm/openai-compatible.ts` 会调用 `getValidatedServerLlmConfig()` 拿模型配置。如果缺少必要环境变量，它会抛出明确错误，最后由 `/api/chat` 返回给前端。

### 2. `src/lib/llm/chat-provider.ts`

这是本阶段新增的 Provider 接口定义文件。

它定义了：

```ts
export type ChatRole = "system" | "user" | "assistant";
export type ChatProviderMessage = {
  role: ChatRole;
  content: string;
};
export interface ChatModelProvider {
  generate(messages: ChatProviderMessage[]): Promise<string>;
}
```

为什么要创建它：`/api/chat` 不应该关心底层具体是哪一家模型服务。只要某个 Provider 实现了 `generate(messages)`，聊天接口就能调用它。

它和其他文件的关系：`openai-compatible.ts` 实现这个接口，`route.ts` 通过这个接口调用模型。后续如果换 DeepSeek、通义千问或 OpenAI，只要继续实现同样接口即可。

### 3. `src/lib/llm/openai-compatible.ts`

这是本阶段新增的 OpenAI-compatible 模型适配器。

它的作用是：

- 从 `getValidatedServerLlmConfig()` 获取服务端模型配置。
- 拼接 `{LLM_BASE_URL}/chat/completions`。
- 用后端 `fetch` 请求外部模型。
- 从 `choices[0].message.content` 中取出回答。
- 处理非 2xx 响应和返回结构异常。

为什么要创建它：OpenAI-compatible 是很多模型服务都支持的通用 Chat Completions 格式。把调用逻辑封装在这个文件里，可以让 `/api/chat` 保持简单。

它和其他文件的关系：`src/app/api/chat/route.ts` 调用 `createOpenAICompatibleChatProvider()`，Provider 再调用外部模型 API。

### 4. `src/app/api/chat/route.ts`

这个文件从 P2 的“模拟回答接口”改成了 P3 的“真实模型调用接口”。

它现在的流程是：

```txt
接收 question
校验 question
构造 system + user messages
创建 OpenAI-compatible Provider
调用 provider.generate(messages)
返回 { answer, sources: [] }
```

为什么要修改它：前端仍然只请求自己的 `/api/chat`，真正的外部模型调用发生在后端，这样 API Key 不会暴露到浏览器。

它和其他文件的关系：请求类型来自 `src/lib/types/chat.ts`，模型调用来自 `src/lib/llm/openai-compatible.ts`，前端调用来自 `src/app/chat/page.tsx`。

### 5. `src/app/chat/page.tsx`

这个文件只做了文案同步，没有改前端请求方式。

为什么不大改：P2 已经把前端改成通过 `request<ChatResponse>("/api/chat")` 调用自己的后端接口。P3 只改变后端实现，前端仍然不直接请求外部模型，也不接触 API Key。

### 6. `src/components/chat/ChatInput.tsx` 和 `src/components/chat/ChatWindow.tsx`

这两个文件只同步了 P3 阶段提示文案。

关系：`ChatInput` 仍然负责受控输入框和发送按钮，`ChatWindow` 仍然负责展示消息、loading 和 error。

### 7. `README.md`

README 更新为 P3 当前阶段，补充了 `.env.local` 中 LLM 配置的说明和 P3 验收方式。

### 8. `.env.example`

已检查，文件中已经存在统一命名的 LLM 配置：

```env
LLM_PROVIDER=openai-compatible
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.example.com/v1
LLM_MODEL=your_chat_model
```

因此本阶段没有重复添加。你需要在本地创建 `.env.local` 并填写真实值，`.env.local` 不能提交到 Git。

## 二、本阶段的完整开发思路

第一步，先检查项目文档和 `.env.example`。  
原因是 P3 明确要求只接外部 Chat API，不做 RAG、数据库或 SSE，同时环境变量命名必须统一。

第二步，完善 `src/lib/config.ts`。  
原因是模型调用需要 API Key、Base URL、Model。如果配置分散在多个文件里，后续排错和换模型会很困难。

第三步，创建 `ChatModelProvider` 统一接口。  
原因是 `/api/chat` 不应该直接绑定某一家模型服务。Provider 接口把“模型如何生成回答”抽象成 `generate(messages)`。

第四步，实现 `OpenAICompatibleChatProvider`。  
这一步解决真实外部模型调用问题，包括请求地址、headers、body、响应解析和错误处理。

第五步，改造 `/api/chat`。  
P2 的模拟 answer 被替换成 `chatProvider.generate(messages)`。前端请求路径、请求体和返回体保持稳定。

第六步，更新文案和文档。  
这样页面、README 和阶段总结都能对应当前 P3 状态。

P3 和后续 RAG 的联系：P3 先把“普通模型回答”能力打通。后续 P7 做 RAG 时，如果知识库没有命中，就可以复用 P3 的普通 LLM 调用作为 fallback。

## 三、逐个知识点讲解

### 1. 什么是外部大模型 API

外部大模型 API 就是第三方提供的模型服务接口。我们把问题发给它，它返回 AI 回答。

本项目里用在 `src/lib/llm/openai-compatible.ts`，通过服务端 `fetch` 请求 `/chat/completions`。

为什么这样用：模型服务需要 API Key，API Key 不能放前端，所以必须由后端调用。

### 2. 什么是 OpenAI-compatible API

OpenAI-compatible 指接口格式兼容 OpenAI Chat Completions，比如请求体里有 `model`、`messages`、`temperature`，响应里有 `choices[0].message.content`。

本项目里 `openai-compatible.ts` 按这个格式发送请求。这样只要某个服务兼容这个格式，就能接入。

### 3. 什么是 Provider 适配层

Provider 适配层就是把不同模型供应商的调用方式包装成同一个接口。

本项目里接口是：

```ts
generate(messages): Promise<string>
```

为什么要这样做：如果以后换模型，不希望 `/api/chat` 和前端一起大改，只需要换 Provider 实现。

### 4. 为什么 API Key 只能放后端

浏览器里的前端代码用户都能看到。如果把 `LLM_API_KEY` 写到 React 组件、localStorage 或前端请求里，密钥就会泄露。

本项目里 API Key 只在 `src/lib/config.ts` 和 `src/lib/llm/openai-compatible.ts` 的后端链路使用，不会返回给前端。

### 5. `.env.local` 和 `.env.example` 的区别

`.env.example` 是示例模板，可以提交到 Git，里面只能放占位值。

`.env.local` 是你本地真实配置，里面会放真实 API Key，不能提交到 Git。

### 6. `lib/config.ts` 的作用

它是环境变量的统一入口。P3 里 `serverConfig` 统一读取 LLM 配置，`getValidatedServerLlmConfig()` 统一校验缺失项。

如果不用这个文件，后续多个接口都直接读 `process.env`，很容易字段名不统一，也不容易集中处理错误。

### 7. Route Handler 如何调用外部 API

`src/app/api/chat/route.ts` 是后端接口。它在服务端运行，所以可以安全读取环境变量，并调用 Provider。

数据流是：

```txt
前端 /chat
→ POST /api/chat
→ Route Handler
→ OpenAICompatibleChatProvider
→ 外部模型 API
→ Route Handler 返回 answer
→ 前端展示 assistant 消息
```

### 8. messages 数组是什么

`messages` 是发给聊天模型的上下文数组。本阶段包含两条：

- `system`：告诉模型应该如何回答。
- `user`：用户当前输入的问题。

后续多轮对话阶段会加入历史 `assistant` 和 `user` 消息。

### 9. system / user / assistant 角色是什么意思

`system` 是规则和身份设定。  
`user` 是用户说的话。  
`assistant` 是模型过去的回复。

P3 只用 `system + user`，还不接历史消息。

### 10. temperature 是什么

`temperature` 控制回答的随机程度。值越高，回答越发散；值越低，回答越稳定。P3 使用 `0.7`，属于常见默认值。

### 11. 为什么返回结构仍然保留 sources

P3 只是普通 AI 对话，没有知识库检索，所以 `sources` 是空数组。

但前端类型和消息结构已经保留 `sources`，后续 RAG 阶段可以直接填入真实引用来源，不需要重写前端消息结构。

## 四、关键代码逐段讲解

### 1. 环境变量校验

位置：`src/lib/config.ts`

```ts
export function getValidatedServerLlmConfig(): ServerLlmConfig {
  const missingFields: string[] = [];
  if (!serverConfig.llmApiKey) missingFields.push("LLM_API_KEY");
  if (!serverConfig.llmBaseUrl) missingFields.push("LLM_BASE_URL");
  if (!serverConfig.llmModel) missingFields.push("LLM_MODEL");
  if (missingFields.length > 0) {
    throw new Error(`模型配置缺失：${missingFields.join("、")}`);
  }
  return serverConfig;
}
```

这段代码解决的问题：在调用模型前确认配置是否完整。

关键变量：

- `missingFields`：记录缺失的环境变量名。
- `serverConfig`：服务端模型配置。

初学者容易看不懂的点：这里不是直接返回空字符串，而是主动抛错。这样前端能看到明确错误，比如“模型配置缺失：LLM_API_KEY”。

### 2. Provider 统一接口

位置：`src/lib/llm/chat-provider.ts`

```ts
export interface ChatModelProvider {
  generate(messages: ChatProviderMessage[]): Promise<string>;
}
```

这段代码解决的问题：让不同模型供应商都遵守同一个调用方式。

数据怎么流动：`/api/chat` 构造 messages，调用 `generate(messages)`，拿到字符串 answer。

### 3. OpenAI-compatible 请求

位置：`src/lib/llm/openai-compatible.ts`

```ts
const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${this.config.apiKey}`,
  },
  body: JSON.stringify({
    model: this.config.model,
    messages,
    temperature: 0.7,
  }),
});
```

这段代码解决的问题：用后端请求外部模型。

关键变量：

- `url`：最终请求地址，一般是 `{LLM_BASE_URL}/chat/completions`。
- `Authorization`：放 API Key 的请求头，只在后端存在。
- `model`：使用的模型名。
- `messages`：system + user 对话内容。
- `temperature`：回答随机度。

初学者容易误解的点：这里的 `fetch` 是后端代码里的 fetch，不是浏览器直接请求外部模型。

### 4. 解析模型响应

位置：`src/lib/llm/openai-compatible.ts`

```ts
const data = (await response.json()) as OpenAICompatibleResponse;
const answer = data.choices?.[0]?.message?.content?.trim();

if (!answer) {
  throw new Error("外部模型返回结构异常：没有找到 choices[0].message.content");
}
```

这段代码解决的问题：从外部模型响应中取出真正要展示的文本。

如果模型服务返回结构不符合预期，就抛出可读错误，避免前端只看到空消息。

### 5. `/api/chat` 调用 Provider

位置：`src/app/api/chat/route.ts`

```ts
const messages: ChatProviderMessage[] = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: question },
];

const chatProvider = createOpenAICompatibleChatProvider();
const answer = await chatProvider.generate(messages);
```

这段代码解决的问题：把用户问题变成模型可理解的 messages，再交给 Provider 生成回答。

数据流动：

```txt
question
→ messages
→ provider.generate
→ answer
→ Response.json({ answer, sources: [] })
```

## 五、本阶段的重难点

### 1. 为什么不能让前端直接调用外部模型 API

因为前端请求会暴露请求地址、headers 和 API Key。任何用户都可以在浏览器开发者工具中看到。正确做法是前端请求自己的 `/api/chat`，由后端转发到外部模型。

### 2. 为什么要封装 LLM Provider

如果 `/api/chat` 里直接写满外部模型请求逻辑，后续换模型会改动很多地方。Provider 把模型调用隔离起来，`route.ts` 只关心 `generate(messages)`。

### 3. 为什么要把模型配置放到环境变量

API Key、Base URL、Model 在不同环境可能不同。放到环境变量后，本地、测试、生产可以使用不同配置，而且真实密钥不会进入代码仓库。

### 4. 为什么要对环境变量缺失做错误处理

如果缺配置还直接请求外部模型，错误可能会变成“401”“Invalid URL”这种不直观的提示。现在会明确告诉你缺少 `LLM_API_KEY`、`LLM_BASE_URL` 或 `LLM_MODEL`。

### 5. 为什么 P3 只做普通 AI 对话，不做 RAG

RAG 还需要文档上传、解析、分块、Embedding、向量库和检索判断。P3 先把普通模型能力打通，后续 RAG 命中失败时也能复用这条 fallback 链路。

### 6. 为什么 sources 现在为空但仍然保留

前端消息展示已经预留引用来源。P3 没有检索，所以没有真实来源；P7 做 RAG 时再把命中的文档片段填进去。

## 六、本阶段容易出错的地方

1. `.env.local` 没配置：创建 `.env.local`，至少填写 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`。
2. baseUrl 少写 `/v1`：多数 OpenAI-compatible 服务需要形如 `https://api.example.com/v1`。
3. 请求地址拼错：本项目会自动拼成 `{LLM_BASE_URL}/chat/completions`，不要在 `LLM_BASE_URL` 里再写 `/chat/completions`。
4. API Key 写到了前端：不要在 `page.tsx`、组件、localStorage 中写密钥。
5. 外部 API 返回结构不一致：检查服务是否兼容 `choices[0].message.content`。
6. 没有处理非 2xx 响应：本项目在 `openai-compatible.ts` 中会读取错误信息并 `throw Error`。
7. messages 格式不对：role 必须是 `system`、`user` 或 `assistant`。
8. 忘记重启 Next.js：修改 `.env.local` 后需要重启 `npm run dev`，否则环境变量可能不生效。

## 七、我应该怎么运行和测试

### 1. 配置 `.env.local`

在项目根目录创建 `.env.local`：

```env
LLM_PROVIDER=openai-compatible
LLM_API_KEY=你的真实_API_Key
LLM_BASE_URL=https://api.example.com/v1
LLM_MODEL=你的聊天模型名称
```

如果你使用 DeepSeek，可以改成：

```env
LLM_PROVIDER=deepseek
LLM_API_KEY=你的_DeepSeek_API_Key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash
```

如果你说的 DeepSeek V4 在控制台里显示的是 `deepseek-v4-pro` 或其他模型 id，就把 `LLM_MODEL` 改成控制台显示的真实模型名。项目代码不把模型名写死，方便你切换。

不要把 `.env.local` 提交到 Git。

### 2. 运行项目

```bash
npm run dev
```

### 3. 打开页面

```txt
http://localhost:3000/chat
```

### 4. 输入什么测试

可以输入：

```txt
请用三句话解释什么是 Next.js Route Handler
```

### 5. 正常结果

页面先展示用户消息，再展示真实 AI 回复。回复内容不再是“这是一个模拟回答”。

### 6. 怎么在 Network 确认请求

打开浏览器开发者工具 Network：

- 应该看到前端只请求 `/api/chat`。
- 不应该看到浏览器直接请求外部模型域名。
- 请求或响应里不应该出现 `LLM_API_KEY`。

### 7. 如果报错，优先检查哪里

- `.env.local` 是否存在。
- `LLM_API_KEY` 是否真实有效。
- `LLM_BASE_URL` 是否包含 `/v1`。
- `LLM_MODEL` 是否是服务商支持的模型名。
- 修改 `.env.local` 后是否重启了开发服务器。

## 八、面试时我应该怎么说

### 30 秒简短版

在 P3 阶段，我把聊天接口从假回答升级成了真实调用外部模型 API。前端仍然只请求自己的 `/api/chat`，API Key 只在 Next.js 后端读取。我还抽了一层 `ChatModelProvider`，把 OpenAI-compatible 的调用封装起来，这样后续换模型供应商时不会影响前端和聊天接口结构。

### 1 分钟详细版

在 P3 阶段，我主要完成了普通 AI 对话能力。具体来说，我先在 `lib/config.ts` 里统一读取和校验 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`，然后定义了 `ChatModelProvider` 接口，再用 `OpenAICompatibleChatProvider` 实现真实模型调用。`/api/chat` 收到前端传来的 question 后，会构造 system 和 user 两条 messages，调用 provider 生成 answer，最后返回 `{ answer, sources: [] }`。我没有让前端直接调用外部模型，因为 API Key 暴露在浏览器里会有安全风险。这个阶段仍然不做 RAG，是为了先把 fallback 普通模型回答能力打通。

### 追问展开版

如果继续展开，我会说这个设计的关键是“前端稳定、后端可替换”。前端只知道调用 `/api/chat`，并不关心底层是 OpenAI、DeepSeek 还是其他兼容服务。后端通过 Provider 适配层屏蔽不同模型服务的差异。现在 `sources` 仍然是空数组，因为 P3 没有知识库检索，但保留这个字段是为了后续 RAG 阶段可以直接返回引用来源。后面做 P4 数据库时，会把会话和消息保存下来；做 P7 RAG 时，会先检索知识库，命中就基于 sources 回答，没命中就复用 P3 的普通模型回答作为 fallback。

## 九、面试官可能追问的问题

### 1. 为什么 API Key 不能放前端？

可以回答：前端代码和请求都能被用户看到，API Key 放前端等于公开密钥。所以我让前端只请求自己的 `/api/chat`，外部模型调用由后端完成。

### 2. 什么是 OpenAI-compatible？

可以回答：它是兼容 OpenAI Chat Completions 的接口格式，请求一般是 `/chat/completions`，body 里有 `model`、`messages`、`temperature`，响应从 `choices[0].message.content` 取回答。

### 3. 为什么要封装 Provider？

可以回答：为了隔离模型供应商差异。`/api/chat` 只调用 `generate(messages)`，后续换模型只改 Provider 实现。

### 4. 如果后面换成 DeepSeek / 通义千问 / OpenAI，要怎么改？

可以回答：如果它们支持 OpenAI-compatible 格式，只需要改 `.env.local` 里的 `LLM_PROVIDER`、`LLM_BASE_URL`、`LLM_MODEL` 和 API Key。比如 DeepSeek 可以使用 `LLM_PROVIDER=deepseek`，base URL 写 `https://api.deepseek.com`，V4 模型可以先填 `deepseek-v4-flash`。如果格式不兼容，就新建一个 Provider 实现同样的 `ChatModelProvider` 接口。

### 5. `.env.local` 和 `.env.example` 有什么区别？

可以回答：`.env.example` 是示例模板，可以提交；`.env.local` 是本地真实密钥配置，不能提交。

### 6. system prompt 是什么？

可以回答：system prompt 是给模型的行为指令，比如让它用中文、结构清晰地回答。它不是用户问题，而是模型回答时要遵守的规则。

### 7. 这个阶段和 RAG 有什么关系？

可以回答：P3 打通了普通模型回答能力。后续 RAG 检索命中时会把文档片段放进 prompt；没命中时就复用 P3 的普通回答作为 fallback。

### 8. 如果外部模型 API 调用失败，你怎么处理？

可以回答：Provider 会判断 `response.ok`，非 2xx 时读取错误信息并抛出 Error。`/api/chat` catch 后返回统一 `{ error }`，前端 request 封装再把错误展示到聊天页。

### 9. 前端怎么知道请求失败？

可以回答：`lib/request.ts` 会把非 2xx 响应转成 Error，`chat/page.tsx` 的 catch 会把错误放进 `error` 状态，`ChatWindow` 负责展示。

### 10. 为什么现在 sources 还是空数组？

可以回答：P3 没做知识库检索，所以没有真实引用来源。但保留字段能让后续 RAG 返回 sources 时前端结构不用重写。

## 十、下一阶段要做什么

下一阶段应该进入 P4：Prisma + MySQL，保存会话和消息。

P3 当前已经具备普通 AI 对话能力，但消息只保存在前端状态里，刷新页面就没了。P4 会引入数据库，把会话、用户消息、AI 消息保存下来。再往后做多轮对话时，后端可以从数据库读取历史消息，拼进 `messages`；做 RAG 时，也可以把 `answer`、`sources`、回答模式等结构一起保存。

P3 的 `/api/chat` 后续会继续被使用：P4 会在它里面增加“保存用户消息和 AI 消息”；P7 会在调用模型前增加“知识库检索和 RAG prompt 构造”；如果检索失败，仍然可以复用 P3 的普通 LLM 调用作为 fallback。
