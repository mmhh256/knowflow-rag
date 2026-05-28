# P1 前端页面壳子与聊天 UI 阶段总结

> 本文档是 P1 阶段的学习笔记和面试讲解稿。它基于当前项目真实代码编写，重点解释“为什么这样写”，而不只是记录“写了哪些文件”。

## 一、本阶段完成了什么

本阶段只完成前端页面壳子和本地模拟聊天交互，没有提前实现 P2、P3 或后续能力。当前项目没有创建 `/api/chat`，没有接入数据库、外部模型、真实文件上传、文档解析、向量化、检索增强生成、流式输出、登录鉴权或 Docker。

### 1. `src/app/page.tsx`

这个文件是首页 `/` 对应的页面。

它的作用是展示项目入口：项目介绍、进入智能问答的按钮、进入知识库的按钮，以及 P1 已完成模块的简单说明。

为什么要创建或修改它：P1 不只是聊天页，还需要一个可以进入产品的首页。首页负责让用户知道这个系统是什么，并提供进入 `/chat`、`/documents` 的入口。

它和其他文件的关系：它使用 `AppShell` 包住页面内容，所以首页会和聊天页、知识库页、设置页共用同一套左侧导航布局。

### 2. `src/app/chat/page.tsx`

这个文件是聊天页面 `/chat`。

它是本阶段最核心的文件，负责管理聊天页的状态，包括：

- `messages`：当前消息列表
- `input`：输入框内容
- `isLoading`：是否正在生成模拟回复
- `mockSources`：模拟引用来源

为什么要创建它：聊天页是整个 RAG 项目的主入口。即使 P1 不接后端，也要先把用户输入、消息展示、模拟回复、引用来源展示这些产品交互跑通。

它和其他文件的关系：

- 调用 `ChatWindow` 展示消息列表。
- 调用 `ChatInput` 展示底部输入框。
- 使用 `ChatMessage`、`SourcePreview` 类型约束消息和来源数据。
- 使用 `AppShell` 复用页面外壳和左侧导航。

### 3. `src/app/documents/page.tsx`

这个文件是知识库页面 `/documents`。

它展示静态文档管理壳子，包括上传按钮占位、文档表格、解析状态、索引状态、分块数和操作按钮。

为什么要创建它：RAG 项目不能只有聊天框，还必须有知识库管理入口。后续 P5/P6 会接真实上传、解析、分块和索引，本阶段先把页面结构和字段位置确定下来。

它和其他文件的关系：它也使用 `AppShell`，因此左侧导航和整体页面风格与聊天页保持一致。

### 4. `src/app/settings/page.tsx`

这个文件是设置页面 `/settings`。

它展示大语言模型配置和向量模型配置的静态占位，包括接口地址、模型名称、密钥和连接测试按钮。

为什么要创建它：后续项目会需要配置在线模型服务，但 P1 不能保存真实密钥，也不能测试连接，所以这里只做页面壳子。

它和其他文件的关系：它使用 `AppShell`，并和 `.env.example`、`src/lib/config.ts` 在概念上对应。P0 先定义环境变量，P1 先做配置页面占位，后续 P10 才会做真实配置保存。

### 5. `src/app/layout.tsx`

这个文件是 App Router 的根布局。

它负责引入全局样式和字体，并设置页面 metadata。当前 metadata 已改成：

- 标题：`知流智能知识库`
- 描述：`智能知识库问答系统前端壳子`

为什么要修改它：根布局影响整个应用，页面标题和描述应该从默认模板改为当前项目名称。

它和其他文件的关系：所有 `src/app/**/page.tsx` 页面都会被 `layout.tsx` 包住。

### 6. `src/components/layout/AppShell.tsx`

这个文件是页面通用外壳。

它负责把页面分成两部分：

- 左侧：`AppSidebar`
- 右侧：当前页面的 `children`

为什么要创建它：如果每个页面都自己写侧边栏，代码会重复，而且布局不统一。抽出 `AppShell` 后，首页、聊天页、知识库页、设置页都可以复用同一套结构。

它和其他文件的关系：

- 引入 `AppSidebar`。
- 接收 `children`，把不同页面内容放到右侧主区域。

### 7. `src/components/layout/AppSidebar.tsx`

这个文件是左侧导航栏。

它包含：

- 项目名称：`知流知识库`
- 页面导航：首页、智能问答、知识库、模型设置
- 会话列表：产品问答、文档理解、模型配置

为什么要创建它：用户需要在几个核心页面之间切换，也需要看到模拟会话入口。根据当前界面调整，会话列表放在左侧导航的“模型设置”下面，而不是单独占聊天页的一列。

它和其他文件的关系：

- 使用 Next.js 的 `Link` 做页面跳转。
- 使用 `usePathname` 判断当前路由，从而给当前页面导航项加高亮样式。
- 被 `AppShell` 引用。

### 8. `src/components/chat/types.ts`

这个文件定义聊天相关的 TypeScript 类型。

当前包含：

- `ChatMessage`：消息类型
- `Conversation`：会话类型
- `SourcePreview`：引用来源预览类型

为什么要创建它：聊天消息和引用来源后续会在多个组件之间传递，如果没有统一类型，很容易出现字段拼错、字段缺失、组件理解不一致的问题。

它和其他文件的关系：

- `src/app/chat/page.tsx` 用它约束 `messages` 和 `mockSources`。
- `ChatWindow`、`MessageBubble`、`ConversationList` 都从这里读取类型。

注意：`ConversationList.tsx` 当前保留为一个聊天会话列表组件，但最终界面把会话列表合并到了 `AppSidebar`，所以 `/chat` 页面现在没有引用它。这个文件可以在后续多会话阶段继续改造或删除。

### 9. `src/components/chat/ChatWindow.tsx`

这个文件是聊天消息展示区。

它负责：

- 接收 `messages`
- 接收 `isLoading`
- 消息为空时显示 `EmptyState`
- 有消息时用 `map` 渲染多个 `MessageBubble`
- 正在生成回复时显示 `Loading`

为什么要创建它：消息展示区逻辑和输入框逻辑不同，拆出来后结构更清晰。后续接流式输出时，也主要会改这里的消息展示方式。

它和其他文件的关系：

- 从 `src/app/chat/page.tsx` 接收数据。
- 使用 `MessageBubble` 渲染单条消息。
- 使用 `EmptyState` 和 `Loading` 展示特殊状态。

### 10. `src/components/chat/MessageBubble.tsx`

这个文件是单条消息组件。

它根据 `message.role` 判断消息是谁发的：

- `user`：右侧蓝色气泡
- `assistant`：左侧正文展示，并在下方展示内嵌“参考来源”卡片

为什么要创建它：聊天页面会有很多消息，如果把每条消息的样式判断都写在 `ChatWindow` 里，代码会越来越乱。拆成 `MessageBubble` 后，一条消息如何展示只由这个组件负责。

它和其他文件的关系：

- 接收 `ChatMessage` 类型的 `message`。
- 使用 `message.sources` 渲染参考来源。
- 被 `ChatWindow` 通过 `messages.map(...)` 调用。

### 11. `src/components/chat/ChatInput.tsx`

这个文件是底部输入框。

它负责：

- 显示 `textarea`
- 通过 `value` 接收输入内容
- 通过 `onChange` 把输入变化传回父组件
- 点击“发送”时调用 `onSend`
- 按 Enter 发送，Shift + Enter 换行
- 空输入或 loading 时禁用发送按钮

为什么要创建它：输入框交互细节比较多，单独拆出来可以让 `/chat/page.tsx` 专注管理状态和发送流程。

它和其他文件的关系：

- 从 `src/app/chat/page.tsx` 接收 `value`、`isLoading`、`onChange`、`onSend`。
- 不自己保存消息，只负责触发父组件传入的函数。

### 12. `src/components/common/EmptyState.tsx`

这个文件是通用空状态组件。

它接收 `title`、`description` 和可选的 `action`，用来展示“当前没有内容”的页面状态。

为什么要创建它：空状态在聊天页、知识库页、后续设置页都可能用到。提前做成通用组件，可以减少重复代码。

它和其他文件的关系：当前被 `ChatWindow` 使用，当 `messages.length === 0` 时展示。

### 13. `src/components/common/Loading.tsx`

这个文件是通用加载状态组件。

它展示三个跳动的小点和一段提示文字，当前默认文案是“正在生成模拟回复”。

为什么要创建它：聊天产品里用户点击发送后，需要看到系统正在处理。如果没有 loading，用户会以为按钮没点上或者页面卡住了。

它和其他文件的关系：当前被 `ChatWindow` 使用，当 `isLoading` 为 `true` 时展示。

### 14. `src/components/chat/ConversationList.tsx`

这个文件是会话列表组件。

它可以接收会话数组、当前会话 id、切换会话函数，然后渲染一组按钮。

为什么创建它：最初 P1 组件拆分建议里包含独立会话列表组件，所以实现了这个组件。后续 UI 调整后，会话列表被合并到了 `AppSidebar` 中。

它和其他文件的关系：当前真实页面没有引用这个组件，但它仍然是一个可复用的会话列表实现。后续做多轮会话和会话切换时，可以选择继续使用它，或者把 `AppSidebar` 中的会话列表逻辑抽回这个组件。

### 15. `README.md`

这个文件是项目基础说明。

本阶段更新了当前阶段、页面入口和 P1 验收方式。

为什么要修改它：README 是别人拿到项目后最先看的文件，需要告诉别人当前项目完成到哪里、怎么运行、哪些功能还没做。

### 16. `renwu/P1_前端页面壳子与聊天UI_阶段总结.md`

这个文件就是当前阶段总结文档。

为什么要创建它：项目按阶段开发，每个阶段都需要沉淀“做了什么、为什么这么做、怎么测试、面试怎么讲”。这份文档用于学习复盘和面试表达。

## 二、本阶段的完整开发思路

### 第一步：先确认 P1 边界

P1 的目标是“先做能看的产品壳子”，不是做后端能力。所以本阶段一开始就明确了不做这些内容：

- 不写 `/api/chat`
- 不接外部模型
- 不接数据库
- 不做真实上传
- 不做文档解析
- 不做向量检索
- 不做流式输出
- 不做登录

为什么先做这个：如果边界不清楚，开发时很容易顺手写接口、顺手接模型，最后 P1 就变成 P2、P3、P7 混在一起，学习和调试都会很乱。

### 第二步：先搭页面路由

本阶段创建了三个页面：

- `src/app/chat/page.tsx`
- `src/app/documents/page.tsx`
- `src/app/settings/page.tsx`

并修改了首页：

- `src/app/page.tsx`

为什么先做页面：Next.js App Router 是按目录生成页面的。只有页面路由先有了，后续组件才知道挂在哪里，用户也才能访问 `/chat`、`/documents`、`/settings`。

这一步解决的问题：先把产品的页面范围确定下来，后续每个阶段都能围绕这些页面继续增强。

### 第三步：抽出通用页面外壳

创建了：

- `src/components/layout/AppShell.tsx`
- `src/components/layout/AppSidebar.tsx`

`AppShell` 负责整体布局，`AppSidebar` 负责左侧导航和会话列表。

为什么这样做：如果每个页面都自己写侧栏，后续改布局要改很多地方。抽成通用外壳后，页面只关心自己的主体内容。

这一步解决的问题：统一页面视觉结构，也让聊天页右侧可以完整留给消息展示。

### 第四步：拆聊天核心组件

创建了：

- `ChatWindow`
- `MessageBubble`
- `ChatInput`
- `types.ts`

为什么这样拆：聊天页天然有三个区域：消息区、单条消息、输入区。每个区域交互不同，拆开后更容易理解。

这一步解决的问题：让 `/chat/page.tsx` 只负责状态和流程，不负责所有 UI 细节。

### 第五步：用 `useState` 做本地模拟交互

在 `src/app/chat/page.tsx` 中，使用：

- `messages` 保存消息列表
- `input` 保存输入框内容
- `isLoading` 保存模拟生成状态

用户点击发送后：

1. 校验输入是否为空
2. 追加用户消息
3. 清空输入框
4. 打开 loading
5. 通过 `setTimeout` 模拟助手回复
6. 追加助手消息
7. 关闭 loading

为什么这样做：P1 不能接后端，但用户仍然需要看到“输入问题 -> 发送 -> 得到回复”的完整交互链路。

### 第六步：知识库页和设置页先做静态壳子

`/documents` 用模拟文档数据展示表格，`/settings` 用静态配置卡片展示模型配置占位。

为什么这样做：后续阶段一定会接上传、解析、索引、模型配置。如果 P1 先把页面位置和字段确定好，后面接真实数据时不会从零开始。

### 第七步：根据界面反馈调整布局

后续根据目标截图做了调整：

- 去掉顶部说明区域
- 去掉独立右侧引用来源栏
- 把引用来源改成助手消息下方的内嵌卡片
- 把会话列表放进左侧导航栏
- 删除不再使用的 `TopNav.tsx` 和 `SourcePanel.tsx`

这一阶段和后续阶段的联系：P2 会把当前本地模拟回复替换为假后端接口；P7 会把内嵌的 `sources` 从模拟数据换成真实检索来源；P8 会把 loading 和一次性回复改造成流式输出。

## 三、逐个知识点讲解

### 1. Next.js App Router

App Router 是 Next.js 的路由系统。它通过 `src/app` 目录中的文件夹和特殊文件生成页面。

本项目里用到的位置：

- `src/app/page.tsx` -> `/`
- `src/app/chat/page.tsx` -> `/chat`
- `src/app/documents/page.tsx` -> `/documents`
- `src/app/settings/page.tsx` -> `/settings`

为什么这样用：RAG 项目需要多个页面入口，App Router 可以让页面结构和文件结构保持一致。

如果不用会有什么问题：如果把所有 UI 都堆在首页里，页面会很乱，也不利于后续把聊天、知识库、设置拆成独立模块。

### 2. `page.tsx` 的作用

`page.tsx` 是 App Router 中的页面文件。某个目录下有 `page.tsx`，这个目录就会成为一个可访问路由。

本项目例子：`src/app/chat/page.tsx` 默认导出 `ChatPage`，所以访问 `/chat` 时会渲染这个组件。

为什么这里要这样用：聊天页、知识库页、设置页都需要独立地址，方便用户直接进入，也方便后续接口和状态围绕页面扩展。

如果不用会有什么问题：没有 `page.tsx`，这个路由就不会被暴露出来，浏览器访问对应路径会找不到页面。

### 3. React 组件拆分

组件拆分就是把一个大页面拆成多个负责不同任务的小组件。

本项目里：

- `AppShell` 负责整体页面外壳
- `AppSidebar` 负责左侧导航和会话列表
- `ChatWindow` 负责消息区域
- `MessageBubble` 负责单条消息
- `ChatInput` 负责底部输入框
- `EmptyState` 负责空状态
- `Loading` 负责加载状态

为什么这里要拆：聊天页如果全部写在 `page.tsx` 里，状态、布局、输入框、消息样式会混在一起。拆组件可以降低理解成本。

如果不拆会有什么问题：后续接假接口、流式输出、引用来源时，一个文件会越来越长，改一个小 UI 容易影响整个页面。

### 4. props 传参

`props` 是父组件传给子组件的数据和函数。

本项目例子：

```tsx
<ChatWindow messages={messages} isLoading={isLoading} />
```

这里 `/chat/page.tsx` 把 `messages` 和 `isLoading` 传给 `ChatWindow`。`ChatWindow` 不需要知道消息从哪里来，只负责展示。

再看输入框：

```tsx
<ChatInput
  value={input}
  isLoading={isLoading}
  onChange={setInput}
  onSend={handleSend}
/>
```

`ChatInput` 不自己决定怎么发送，而是调用父组件传进来的 `onSend`。

为什么这样用：父组件管理状态，子组件负责展示和触发事件，数据流更清楚。

如果不用会有什么问题：每个组件都自己保存状态，会出现状态不同步，比如输入框里有内容，但父组件不知道用户输入了什么。

### 5. `useState` 状态管理

`useState` 是 React 管理组件内部状态的 Hook。

本项目里在 `src/app/chat/page.tsx` 用到了：

```tsx
const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
const [input, setInput] = useState("");
const [isLoading, setIsLoading] = useState(false);
```

这些状态分别表示：

- `messages`：页面上显示的所有消息
- `input`：输入框当前文字
- `isLoading`：是否正在等待模拟回复

为什么这里要这样用：P1 不接后端，但仍然需要页面在用户操作后变化。`useState` 可以让 React 在状态变化后自动重新渲染页面。

如果不用会有什么问题：点击发送后页面不会自动更新，输入框也很难清空。

### 6. 受控输入框

受控输入框是指输入框的值由 React 状态控制。

本项目位置：`src/components/chat/ChatInput.tsx`

```tsx
<textarea
  value={value}
  onChange={(event) => onChange(event.target.value)}
/>
```

`value` 来自父组件的 `input` 状态，用户输入时通过 `onChange` 更新父组件状态。

为什么这里要这样用：发送后要清空输入框，空输入要禁用按钮，按 Enter 要触发发送。这些都依赖 React 能准确知道当前输入内容。

如果不用会有什么问题：输入框内容只存在浏览器 DOM 里，React 不知道它是什么，就很难做校验和清空。

### 7. 事件处理：`onChange` / `onClick` / 键盘事件

事件处理就是用户操作页面时触发函数。

本项目里：

- `onChange`：输入框内容变化时更新 `input`
- `onClick`：点击发送按钮时调用 `handleSend`
- `onKeyDown`：按 Enter 时发送，Shift + Enter 换行

`ChatInput.tsx` 中：

```tsx
onKeyDown={(event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (canSend) {
      onSend();
    }
  }
}}
```

为什么这里要这样用：聊天产品通常支持 Enter 发送，但也要允许 Shift + Enter 换行。

如果不用会有什么问题：只能点按钮发送，体验不自然；或者 Enter 默认换行，不能快速发送消息。

### 8. 条件渲染

条件渲染是根据状态决定显示什么。

本项目例子：

```tsx
{messages.length === 0 ? (
  <EmptyState ... />
) : (
  messages.map((message) => (
    <MessageBubble key={message.id} message={message} />
  ))
)}

{isLoading ? <Loading /> : null}
```

为什么这里要这样用：聊天页可能有“没有消息”“有消息”“正在生成回复”几种状态，界面要根据状态变化。

如果不用会有什么问题：空页面没有提示，用户不知道该做什么；发送后没有 loading，用户不知道系统是否在处理。

### 9. 列表渲染 `map`

列表渲染就是把数组变成一组组件。

本项目里消息列表用：

```tsx
messages.map((message) => (
  <MessageBubble key={message.id} message={message} />
))
```

引用来源也用：

```tsx
message.sources.map((source) => (
  <div key={source.id}>...</div>
))
```

为什么这里要这样用：消息和来源都是数组，数量会变化，不能手写固定几个元素。

如果不用会有什么问题：只能展示固定数量的消息，后续多轮对话和多个引用来源都无法扩展。

### 10. TypeScript 类型定义

TypeScript 类型用来规定数据长什么样。

本项目位置：`src/components/chat/types.ts`

```tsx
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: SourcePreview[];
};
```

关键点：

- `role` 只能是 `"user"` 或 `"assistant"`
- `sources?` 表示引用来源可选，不是每条消息都有

为什么这里要这样用：用户消息没有来源，助手消息可能有来源。如果类型写清楚，组件里就知道要先判断 `message.sources?.length`。

如果不用会有什么问题：字段名写错时不容易发现，比如把 `createdAt` 写成 `createAt`，页面可能运行时才出错。

### 11. Tailwind CSS 布局

Tailwind CSS 是用工具类写样式。

本项目例子：

```tsx
<div className="flex min-h-screen">
```

表示使用弹性布局，并且最小高度是一屏。

聊天页：

```tsx
<div className="flex h-screen min-h-[720px] flex-col overflow-hidden">
```

表示右侧主区域占满屏幕高度，并且内部按纵向排列。

为什么这里要这样用：聊天界面需要固定底部输入框，中间消息区滚动。`flex`、`overflow-y-auto`、`min-h-0` 这些类就是为了处理这种布局。

如果不用会有什么问题：消息多了以后可能把输入框挤出屏幕，或者页面整体滚动而不是消息区滚动。

### 12. 组件复用

组件复用是指同一个组件可以在多个地方使用。

本项目里 `AppShell` 被首页、聊天页、知识库页、设置页复用。`EmptyState` 和 `Loading` 目前在聊天页使用，后续也可以给文档页或设置页使用。

为什么这里要这样用：复用可以保证页面风格统一，也减少重复代码。

如果不用会有什么问题：每个页面复制一份布局，后续改侧栏要改很多文件。

### 13. 空状态和 loading 状态

空状态告诉用户“当前没有内容，下一步可以做什么”。loading 状态告诉用户“系统正在处理”。

本项目里：

- `EmptyState`：消息为空时提示用户开始提问
- `Loading`：点击发送后显示“正在生成模拟回复”

为什么这里要这样用：聊天产品不是只有最终结果，中间状态也很重要。用户需要知道系统有没有响应。

如果不用会有什么问题：页面会显得像坏了，尤其是发送后等待回复的几百毫秒，用户可能重复点击。

## 四、关键代码逐段讲解

### 1. 聊天页状态定义

位置：`src/app/chat/page.tsx`

```tsx
const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
const [input, setInput] = useState("");
const [isLoading, setIsLoading] = useState(false);
```

这段代码解决的问题：让聊天页面可以记住消息、输入内容和加载状态。

关键变量：

- `messages`：消息数组，页面上渲染的内容来自它
- `setMessages`：更新消息数组
- `input`：输入框当前内容
- `setInput`：更新输入框内容
- `isLoading`：控制 loading 是否显示，也控制发送按钮是否禁用

数据怎么流动：

1. `input` 传给 `ChatInput`
2. 用户输入时 `ChatInput` 调用 `setInput`
3. 点击发送时 `handleSend` 读取 `input`
4. `handleSend` 更新 `messages`
5. `messages` 传给 `ChatWindow`
6. `ChatWindow` 渲染 `MessageBubble`

初学者容易看不懂的点：`useState` 返回的是一对值，不是一个普通变量。必须用 `setMessages` 这类更新函数修改状态，不能直接 `messages.push(...)`。

### 2. 发送消息流程

位置：`src/app/chat/page.tsx`

```tsx
function handleSend() {
  const question = input.trim();
  if (!question || isLoading) {
    return;
  }

  const userMessage: ChatMessage = {
    id: createMessageId("user"),
    role: "user",
    content: question,
    createdAt: createTimestamp(),
  };

  setMessages((currentMessages) => [...currentMessages, userMessage]);
  setInput("");
  setIsLoading(true);

  window.setTimeout(() => {
    const assistantMessage: ChatMessage = {
      id: createMessageId("assistant"),
      role: "assistant",
      content: `这是针对“${question}”的本地模拟回复。P2 阶段这里会改为请求假后端接口，但 P1 只保留在前端状态中。`,
      createdAt: createTimestamp(),
      sources: mockSources,
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      assistantMessage,
    ]);
    setIsLoading(false);
  }, 600);
}
```

这段代码解决的问题：模拟完整聊天流程。

关键变量：

- `question`：去掉空格后的用户问题
- `userMessage`：用户消息对象
- `assistantMessage`：助手模拟回复对象
- `mockSources`：模拟参考来源，会显示在助手消息下方

数据怎么流动：

1. 用户输入内容存在 `input`
2. 点击发送后生成 `userMessage`
3. `setMessages` 把用户消息加到数组末尾
4. `setInput("")` 清空输入框
5. `setIsLoading(true)` 显示加载状态
6. 600 毫秒后生成助手消息
7. 再次 `setMessages` 追加助手消息
8. `setIsLoading(false)` 关闭加载状态

初学者容易看不懂的点：这里两次 `setMessages` 都使用函数写法：

```tsx
setMessages((currentMessages) => [...currentMessages, userMessage]);
```

这样可以拿到最新的消息数组，避免异步更新时读到旧数据。

### 3. 受控输入框

位置：`src/components/chat/ChatInput.tsx`

```tsx
const canSend = value.trim().length > 0 && !isLoading;
```

这段代码解决的问题：判断当前是否允许发送。

关键变量：

- `value`：输入框内容
- `isLoading`：是否正在生成回复
- `canSend`：按钮是否可用

继续看输入框：

```tsx
<textarea
  value={value}
  onChange={(event) => onChange(event.target.value)}
  onKeyDown={(event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  }}
/>
```

数据怎么流动：

1. 父组件把 `input` 作为 `value` 传进来
2. 用户输入时触发 `onChange`
3. `onChange(event.target.value)` 调用父组件的 `setInput`
4. 父组件状态更新后，新的 `value` 又传回输入框

初学者容易看不懂的点：输入框自己不保存状态，真正的数据在父组件 `/chat/page.tsx` 中。

### 4. 消息列表渲染

位置：`src/components/chat/ChatWindow.tsx`

```tsx
{messages.length === 0 ? (
  <EmptyState
    title="开始一次知识库问答"
    description="在底部输入问题。P1 会追加你的消息和一条模拟助手回复，不会调用任何后端服务。"
  />
) : (
  messages.map((message) => (
    <MessageBubble key={message.id} message={message} />
  ))
)}

{isLoading ? <Loading /> : null}
```

这段代码解决的问题：根据消息状态展示不同 UI。

关键变量：

- `messages.length`：判断是否有消息
- `message.id`：列表渲染的唯一 key
- `isLoading`：控制是否展示加载组件

数据怎么流动：

1. `/chat/page.tsx` 把 `messages` 传给 `ChatWindow`
2. `ChatWindow` 遍历 messages
3. 每条消息交给 `MessageBubble`

初学者容易看不懂的点：`key` 不是展示给用户看的，它是 React 用来识别每一项的。如果没有稳定 `key`，列表更新时可能出现渲染异常。

### 5. 用户消息和助手消息样式区分

位置：`src/components/chat/MessageBubble.tsx`

```tsx
const isUser = message.role === "user";
```

这段代码解决的问题：根据消息角色决定布局和样式。

用户消息：

```tsx
isUser
  ? "rounded-lg bg-blue-500 px-4 py-3 text-white shadow-sm"
  : "text-slate-700"
```

助手消息来源卡片：

```tsx
{!isUser && message.sources?.length ? (
  <div className="mt-4 rounded-lg bg-slate-100 px-4 py-3">
    <div className="text-xs font-semibold text-slate-500">
      参考来源
    </div>
    ...
  </div>
) : null}
```

关键变量：

- `isUser`：是否用户消息
- `message.sources`：助手消息的参考来源
- `source.score`：模拟匹配分数

数据怎么流动：`ChatPage` 创建消息，助手消息带 `sources`，`MessageBubble` 接到消息后判断 role 和 sources，再决定是否渲染来源卡片。

初学者容易看不懂的点：`message.sources?.length` 里的 `?.` 是可选链，意思是如果 `sources` 不存在就不要继续读 `length`，避免报错。

### 6. 左侧导航和会话列表

位置：`src/components/layout/AppSidebar.tsx`

```tsx
const navItems = [
  { href: "/", label: "首页" },
  { href: "/chat", label: "智能问答" },
  { href: "/documents", label: "知识库" },
  { href: "/settings", label: "模型设置" },
];

const conversations = [
  { title: "产品问答", time: "刚刚" },
  { title: "文档理解", time: "昨天" },
  { title: "模型配置", time: "草稿" },
];
```

这段代码解决的问题：用数组配置导航和会话列表，避免手写重复按钮。

当前路由高亮：

```tsx
const pathname = usePathname();
const isActive =
  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
```

关键变量：

- `navItems`：导航配置
- `conversations`：模拟会话数据
- `pathname`：当前浏览器路径
- `isActive`：当前导航项是否选中

初学者容易看不懂的点：`usePathname` 只能在客户端组件中使用，所以文件顶部必须有 `"use client"`。

## 五、本阶段的重难点

### 1. 为什么要拆组件

难点不是“会不会写 JSX”，而是“把代码放在哪里”。当前拆分方式是：

- 页面状态放在 `src/app/chat/page.tsx`
- 输入框放在 `ChatInput`
- 消息列表放在 `ChatWindow`
- 单条消息样式放在 `MessageBubble`
- 页面外壳放在 `AppShell`
- 导航和会话入口放在 `AppSidebar`

这样做的好处是后续 P2 接接口时，只需要重点改 `handleSend`；P7 接真实 sources 时，重点改消息数据来源和 `MessageBubble` 的来源展示。

### 2. 为什么输入框要做成受控组件

因为聊天输入框需要做这些事情：

- 空输入不能发送
- loading 时不能重复发送
- 发送后要清空输入框
- Enter 发送，Shift + Enter 换行

这些都依赖 React 能知道输入框内容。受控组件把输入值放在 `input` state 中，所以逻辑可控。

### 3. 为什么消息要区分 `user` 和 `assistant`

用户消息和助手消息在产品里承担的职责不同：

- 用户消息：表达问题，右侧蓝色气泡
- 助手消息：展示回答，左侧正文，并带参考来源

如果不区分 role，后续无法正确显示回答模式、检索状态、引用来源，也无法做多轮对话上下文。

### 4. 为什么要提前预留 `sources`

RAG 项目最重要的不是“回答了什么”，还包括“依据是什么”。当前 `ChatMessage` 已经有：

```tsx
sources?: SourcePreview[];
```

这让助手消息可以携带参考来源。P1 用的是模拟数据，P7 会换成真实检索结果。

如果现在不预留，后续接 RAG 时需要重构消息结构、消息气泡和聊天响应结构。

### 5. 为什么现在不能提前接后端

当前阶段目标是前端页面壳子。如果现在接后端，会同时遇到接口设计、错误处理、异步请求、模型调用、密钥安全等问题，学习重点会散掉。

P1 只用 `setTimeout` 模拟回复，是为了先验证交互链路。P2 再把这段模拟逻辑替换成假接口请求。

### 6. 为什么页面结构要为 RAG、SSE、多轮对话做准备

当前结构已经预留了几个关键位置：

- `messages` 数组：后续可以存多轮对话
- `role` 字段：区分用户和助手
- `sources` 字段：后续接真实引用来源
- `isLoading` 状态：后续可以扩展成流式输出状态
- 左侧会话列表：后续可以改造成真实会话列表

这些都是后续阶段继续扩展的基础。

## 六、本阶段容易出错的地方

### 1. 组件拆得太碎或太乱

错误表现：一个组件只用一次但拆得过多，或者组件职责不清。

避免方式：按职责拆，而不是按行数拆。当前 `ChatInput`、`ChatWindow`、`MessageBubble` 都有明确职责。

### 2. 状态放错位置

错误表现：输入框自己保存输入内容，聊天页也保存输入内容，两个状态不同步。

避免方式：谁需要协调多个组件，状态就放谁那里。当前 `messages`、`input`、`isLoading` 都放在 `/chat/page.tsx`，再通过 props 传给子组件。

### 3. 输入框没有清空

错误表现：点击发送后问题还留在输入框里。

避免方式：发送成功追加用户消息后调用：

```tsx
setInput("");
```

### 4. 空输入也能发送

错误表现：用户输入空格也会生成一条空消息。

避免方式：使用：

```tsx
const question = input.trim();
if (!question || isLoading) {
  return;
}
```

### 5. `map` 渲染没有 `key`

错误表现：React 控制台警告，列表更新时可能出现渲染错乱。

避免方式：消息用 `message.id`，来源用 `source.id`。

### 6. `user` / `assistant` 消息样式没有区分

错误表现：用户问题和助手回答混在一起，聊天界面难以阅读。

避免方式：用 `message.role` 计算 `isUser`，再决定左右布局和颜色。

### 7. 过早写后端逻辑导致项目复杂

错误表现：P1 阶段就开始写接口、模型调用、数据库保存，导致页面问题和接口问题混在一起。

避免方式：严格遵守阶段边界。P1 只做本地模拟，P2 才写假接口。

### 8. 页面结构没有给引用来源留位置

错误表现：后续接 RAG 后不知道 sources 放在哪里，只能临时加一个区域。

避免方式：当前在助手消息下方内嵌“参考来源”卡片，和真实 RAG 回答更接近。

## 七、我应该怎么运行和测试

### 1. 运行命令

普通终端：

```bash
npm run dev
```

如果 PowerShell 拦截 `npm.ps1`：

```bash
npm.cmd run dev
```

如果 3000 端口被占用：

```bash
npm.cmd run dev -- -p 3002
```

### 2. 打开页面

```txt
http://localhost:3000
http://localhost:3000/chat
http://localhost:3000/documents
http://localhost:3000/settings
```

如果使用 3002 端口，就把地址里的 `3000` 换成 `3002`。

### 3. 测试哪些功能

聊天页 `/chat`：

1. 左侧能看到导航：首页、智能问答、知识库、模型设置。
2. 左侧模型设置下面能看到会话列表。
3. 右侧主区域直接展示聊天内容，没有顶部说明块。
4. 助手消息下方能看到“参考来源”内嵌卡片。
5. 底部输入框可以输入问题。
6. 点击“发送”后，右侧出现用户蓝色消息。
7. 出现 loading 状态。
8. 约 600 毫秒后出现助手模拟回复。
9. 输入框被清空。
10. 空输入时发送按钮不可用。

知识库页 `/documents`：

1. 能看到上传文档占位按钮。
2. 能看到文档表格。
3. 能看到解析状态、索引状态、分块数、预览、重新索引、删除按钮占位。

设置页 `/settings`：

1. 能看到大语言模型配置占位。
2. 能看到向量模型配置占位。
3. 输入框是只读占位，不保存任何内容。

### 4. 正常结果是什么

代码检查应该通过：

```bash
npm.cmd run lint
npm.cmd run build
```

本阶段已验证这两个命令通过。

### 5. 如果报错，优先检查哪里

- 页面打不开：检查开发服务器是否启动，端口是否被占用。
- PowerShell 不能运行 `npm`：改用 `npm.cmd`。
- TypeScript 报错：先检查 `ChatMessage`、`SourcePreview` 类型是否和数据字段一致。
- 页面没有更新：确认是否保存文件，必要时重启 `npm.cmd run dev`。
- 输入框不能发送：检查 `canSend` 是否为 `true`，也就是输入是否为空、`isLoading` 是否还没结束。

## 八、面试时我应该怎么说

### 1. 30 秒简短版

在 P1 阶段，我主要完成了项目的前端页面壳子和聊天 UI。我用 Next.js App Router 实现了首页、聊天页、知识库页和设置页；聊天页用 React 的 `useState` 做本地模拟交互，支持输入问题、发送消息、展示 loading 和模拟助手回复。我还把消息区、输入框、消息气泡、左侧导航和通用空状态拆成组件，并在助手消息里预留了参考来源卡片，为后续接 RAG 检索结果做准备。

### 2. 1 分钟详细版

在 P1 阶段，我没有急着接后端，而是先把产品前端壳子搭起来。页面上我实现了 `/`、`/chat`、`/documents`、`/settings` 四个路由，并用 `AppShell` 和 `AppSidebar` 统一布局。聊天页的状态集中放在 `src/app/chat/page.tsx`，包括消息列表、输入框内容和 loading 状态。输入框是受控组件，空输入不能发送，发送后会清空输入框，并通过本地 `setTimeout` 模拟助手回复。消息组件会根据 `role` 区分用户和助手，用户消息在右侧，助手消息在左侧，并且助手消息下方内嵌参考来源卡片。这样后续 P2 接假接口、P7 接真实 RAG sources 时，页面结构不用大改。

### 3. 面试官追问时可以继续展开说的版本

我在这个阶段主要关注两个点：第一是页面结构，第二是状态边界。页面结构上，我没有把所有内容都写在 `page.tsx` 里，而是拆成 `AppShell`、`AppSidebar`、`ChatWindow`、`MessageBubble`、`ChatInput` 这些组件。这样每个组件职责比较单一，后续维护成本低。状态边界上，我把 `messages`、`input`、`isLoading` 都放在 `/chat/page.tsx`，因为这些状态需要协调多个子组件。输入框通过 props 接收 value 和事件函数，所以它是一个受控组件。消息展示通过 `messages.map` 渲染，每条消息都有 `role` 和 `sources` 字段。`role` 用来决定消息样式，`sources` 是为后续 RAG 引用来源预留的。这个阶段我刻意没有写后端请求，因为 P1 的目标是确认 UI 和交互链路，后续 P2 再把本地模拟发送逻辑替换成假接口。

## 九、面试官可能追问的问题

### 1. 为什么要这样拆组件？

可以回答：因为聊天页包含多个职责：整体布局、左侧导航、消息列表、单条消息、输入框、空状态和加载状态。如果都写在一个文件里，后续接接口和流式输出时会很难维护。现在拆分后，`page.tsx` 管状态，子组件管展示，边界更清楚。

### 2. `useState` 在这里管理了什么？

可以回答：主要管理三类状态：`messages` 保存消息列表，`input` 保存输入框内容，`isLoading` 控制是否展示模拟生成状态和是否禁用发送按钮。

### 3. 什么是受控组件？

可以回答：受控组件就是表单输入值由 React state 控制。本项目中 `ChatInput` 的 `textarea` 使用 `value={value}`，输入变化时通过 `onChange` 通知父组件更新 state。这样可以方便做空输入校验、发送后清空、loading 时禁用发送。

### 4. 为什么要预留 sources？

可以回答：因为 RAG 项目不仅要回答问题，还要展示答案依据。P1 里 `sources` 是模拟数据，但结构已经放进 `ChatMessage`，并在助手消息下方展示“参考来源”。后续接真实检索时，只需要把模拟 sources 换成接口返回的 sources。

### 5. 为什么不一开始就接后端？

可以回答：如果一开始就接后端，页面、接口、模型、数据库问题会混在一起，调试成本高。这个项目按阶段推进，P1 先验证 UI 和交互，P2 再接假接口，P3 再接真实模型，风险更小。

### 6. 这个阶段和 RAG 有什么关系？

可以回答：P1 还没有实现真实 RAG，但已经为 RAG 做了界面和数据结构准备。比如助手消息里预留了 `sources`，知识库页预留了文档状态和分块数，聊天页预留了消息列表和 loading 状态。这些都会在后续 RAG 阶段继续使用。

### 7. 为什么消息要区分 `user` 和 `assistant`？

可以回答：因为不同角色的消息展示方式不同，用户消息是问题，助手消息是回答，还可能携带参考来源。后续保存多轮对话时，数据库和接口也需要知道每条消息的角色。

### 8. 为什么要有 loading 状态？

可以回答：聊天产品里生成回复需要时间。即使 P1 是模拟回复，也要让用户看到系统正在处理。后续接真实模型和流式输出时，loading 状态会扩展成更完整的生成状态。

### 9. 为什么引用来源放在消息内部，而不是右侧独立面板？

可以回答：当前 UI 更接近聊天记录式阅读，答案和依据放在一起，用户阅读时不需要左右切换视线。后续如果 sources 很多，也可以继续扩展成可折叠区域或抽屉，但 P1 先保持简单直观。

### 10. `ConversationList.tsx` 当前为什么没有用？

可以回答：最初按组件建议实现了独立会话列表组件，后来根据界面调整把会话列表合并到 `AppSidebar`。当前文件保留为候选组件，后续做真实多会话时可以复用或重构。

## 十、下一阶段要做什么

下一阶段是 P2：假后端接口，统一返回 RAG 优先响应结构。

P2 的目标：

- 创建 `POST /api/chat`
- 前端发送 `question`
- 后端返回固定模拟结构：
  - `answer`
  - `answerMode`
  - `retrievalStatus`
  - `fallbackReason`
  - `sources`
- 前端不再用 `setTimeout` 直接生成助手消息，而是调用假接口拿结果

当前阶段会被继续使用或改造的代码：

- `src/app/chat/page.tsx`
  - `handleSend` 会从本地 `setTimeout` 改成请求 `/api/chat`。

- `src/components/chat/types.ts`
  - 需要增加或对齐 P2 的响应类型，比如 `answerMode`、`retrievalStatus`、`fallbackReason`。

- `src/components/chat/MessageBubble.tsx`
  - 会继续展示助手回答和 `sources`。

- `src/components/chat/ChatInput.tsx`
  - 继续负责输入和发送触发，不需要大改。

- `src/components/chat/ChatWindow.tsx`
  - 继续负责消息列表和 loading 状态展示。

- `src/components/layout/AppSidebar.tsx`
  - 后续多轮会话阶段可以把模拟会话列表替换成真实会话列表。

P2 仍然不要接真实外部模型、数据库、文档解析、向量库或流式输出。它只负责把“本地模拟回复”升级成“假后端接口返回”。
