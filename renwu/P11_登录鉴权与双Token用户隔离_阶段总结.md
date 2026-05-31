# P11 登录鉴权与双 Token 用户隔离阶段总结

## 一、本阶段完成了什么

本阶段把项目从 P4 以来的 `mock-user-001` 演示用户，升级成真实注册、登录、退出、双 Token 鉴权和用户数据隔离。

### 新增文件

1. `src/lib/auth/password.ts`
   - 作用：封装 `hashPassword` 和 `verifyPassword`。
   - 为什么创建：注册时不能保存明文密码，必须保存 bcrypt 哈希；登录时用 bcrypt 对比密码。
   - 关系：被 `/api/auth/register` 和 `/api/auth/login` 调用。

2. `src/lib/auth/jwt.ts`
   - 作用：签发和验证 Access Token / Refresh Token。
   - 为什么创建：把 JWT 逻辑集中管理，避免每个接口里重复写签名和校验。
   - 关系：依赖 `lib/config.ts` 的 JWT secret；被登录、注册、刷新、当前用户解析逻辑使用。

3. `src/lib/auth/cookies.ts`
   - 作用：统一写入、读取、清除 `access_token` 和 `refresh_token` Cookie。
   - 为什么创建：Token 必须放在 `httpOnly Cookie`，不能放 `localStorage`。
   - 关系：被登录、注册、退出、刷新、当前用户解析使用。

4. `src/lib/auth/current-user.ts`
   - 作用：从 Cookie 里的 Access Token 解析当前用户，并提供 `requireCurrentUser()`。
   - 为什么创建：后端业务接口不能相信前端传来的 `userId`，必须从服务端验证过的 token 得到用户身份。
   - 关系：`/api/chat`、会话接口、文档接口全部改为调用它。

5. `src/app/api/auth/register/route.ts`
   - 作用：注册接口，校验邮箱和密码，写入 `passwordHash`，注册后自动登录。
   - 关系：调用 `hashPassword`、`signAccessToken`、`signRefreshToken`、`setAuthCookies`。

6. `src/app/api/auth/login/route.ts`
   - 作用：登录接口，校验账号密码，成功后写入双 Token Cookie。
   - 关系：调用 `verifyPassword` 和 JWT / Cookie 工具。

7. `src/app/api/auth/logout/route.ts`
   - 作用：退出登录，清除双 Token Cookie。

8. `src/app/api/auth/me/route.ts`
   - 作用：返回当前登录用户；未登录返回 401。

9. `src/app/api/auth/refresh/route.ts`
   - 作用：使用 `refresh_token` 续签新的 `access_token`。
   - 关系：只负责续签，不直接访问业务数据。

10. `src/app/login/page.tsx`、`src/app/register/page.tsx`
    - 作用：蓝色渐变背景、居中卡片风格的登录和注册页面。
    - 关系：调用 `store/auth-store.ts` 中的 `login` / `register`。

11. `src/components/auth/AuthBackground.tsx`
    - 作用：登录注册页的蓝色渐变背景和圆形装饰。

12. `src/components/auth/AuthCard.tsx`
    - 作用：登录注册页共用的白色圆角卡片、Logo 和标题区域。

13. `src/components/auth/AuthInput.tsx`
    - 作用：登录注册表单共用输入框。

14. `src/components/auth/AuthGuard.tsx`
    - 作用：保护 `/chat`、`/documents`、`/settings` 等业务页面。
    - 关系：进入页面时先请求 `/api/auth/me`，失败后尝试 `/api/auth/refresh`，再失败跳转登录页。

15. `src/store/auth-store.ts`
    - 作用：前端登录状态管理，保存 `user`、`isLoading`、`isAuthenticated`，提供 `login`、`register`、`logout`、`fetchMe`、`refreshAccessToken`。
    - 说明：前端不保存 token，只保存用户展示信息；token 由浏览器自动携带 Cookie。

### 修改文件

1. `prisma/schema.prisma`
   - 修改：`User.email` 改为必填，新增 `passwordHash String @default("")`。
   - 作用：支持真实账号密码登录。
   - 注意：修改 schema 后需要执行 Prisma migration。

2. `.env.example`
   - 新增：`JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`、`ACCESS_TOKEN_EXPIRES_IN`、`REFRESH_TOKEN_EXPIRES_IN`。
   - 作用：告诉使用者本地需要配置 JWT 密钥和 token 有效期。

3. `src/lib/config.ts`
   - 修改：新增 Auth 配置读取和 `getValidatedAuthConfig()`。
   - 作用：统一读取 JWT secret，缺失时给出明确错误。

4. `src/lib/request.ts`
   - 修改：请求默认带 `credentials: "include"`；业务接口遇到 401 时自动请求 `/api/auth/refresh` 并重试一次。
   - 作用：让普通 JSON 接口统一支持 Cookie 鉴权和 Access Token 续签。

5. `src/app/api/chat/route.ts`、`src/app/api/chat/stream/route.ts`
   - 修改：删除 `ensureMockUser()` / `MOCK_USER_ID`，改为 `requireCurrentUser()`。
   - 作用：聊天、RAG、SSE 都绑定当前登录用户。

6. `src/app/api/conversations/route.ts`
   - 修改：会话列表和新建会话都使用当前登录用户。
   - 作用：用户只能看到和创建自己的会话。

7. `src/app/api/conversations/[id]/messages/route.ts`
   - 修改：加载历史消息前先验证会话属于当前用户。
   - 作用：避免 A 用户读取 B 用户的消息。

8. `src/app/api/documents/route.ts`、`src/app/api/documents/upload/route.ts`、`src/app/api/documents/[id]/route.ts`、`src/app/api/documents/[id]/index/route.ts`
   - 修改：文档列表、上传、详情、删除、索引全部按当前用户过滤。
   - 作用：用户只能操作自己的知识库文档。

9. `src/lib/rag/retrieve.ts`
   - 修改：检索 indexed 文档时传入 `userId`。
   - 作用：RAG 检索只检索当前用户自己的向量化文档。

10. `src/lib/rag/index-document.ts`
    - 修改：索引文档时传入 `documentId + userId`。
    - 作用：只能向量化当前用户自己的文档。

11. `src/lib/agent/nodes/retrieve.ts`
    - 修改：Agentic RAG 检索节点把 `state.userId` 传给检索服务。

12. `src/components/layout/AppShell.tsx`
    - 修改：新增 `requireAuth`，业务页面默认受保护，首页传 `requireAuth={false}`。

13. `src/components/layout/AppSidebar.tsx`
    - 修改：显示当前用户信息和退出登录按钮。

14. `src/app/chat/page.tsx`
    - 修改：SSE 请求显式带 Cookie；遇到 401 时尝试 refresh 后重试。

15. `package.json`、`package-lock.json`
    - 新增依赖：`bcryptjs`、`jose`。

## 二、本阶段完整开发思路

1. 先改 `User` 表。
   - 登录系统的核心是用户账号，所以必须先让数据库能保存 `email` 和 `passwordHash`。

2. 再做密码加密工具。
   - 注册和登录都会用到密码处理，先封装 `hashPassword` / `verifyPassword`，后面的接口就不会重复写加密逻辑。

3. 再做 JWT 工具。
   - Access Token 和 Refresh Token 都是 JWT，但它们用途和有效期不同，所以集中到 `lib/auth/jwt.ts`。

4. 再做 Cookie 工具。
   - Token 不返回给前端页面，而是写入 `httpOnly Cookie`，所以读写 Cookie 也单独封装。

5. 再做 `current-user` 工具。
   - 业务接口只关心“当前是谁”，不应该自己解析 token，所以用 `requireCurrentUser()` 统一处理。

6. 再做认证接口。
   - 注册、登录、退出、获取当前用户、刷新 token 是完整登录闭环。

7. 再替换 mock 用户。
   - P4 的 `mock-user-001` 是演示阶段方案；P11 把它替换成真实登录用户，所有查询都绑定 `user.id`。

8. 最后做登录注册页面和页面保护。
   - 后端鉴权先完成，再做前端页面，保证 UI 提交后有真实接口可调用。

## 三、逐个知识点讲解

### 登录鉴权是什么

登录鉴权就是确认“当前请求是谁发的”。本项目里，用户登录后后端写入 `access_token` Cookie，之后访问 `/api/chat`、`/api/documents` 等接口时，后端通过 `requireCurrentUser()` 解析 Cookie，确认当前用户。

### 用户数据隔离是什么

用户数据隔离就是每个用户只能看自己的数据。代码里体现为：查询 `Conversation` 和 `Document` 时都带上 `userId: user.id`。如果只按 `id` 查，就可能出现 A 用户访问 B 用户资源的问题。

### 密码哈希和 bcrypt

`bcryptjs` 会把密码变成不可逆的哈希。注册时保存 `passwordHash`，登录时用 `verifyPassword(password, user.passwordHash)` 对比。这样数据库里不会出现明文密码。

### JWT、Access Token、Refresh Token

JWT 是带签名的身份凭证。Access Token 有效期短，用来访问业务接口；Refresh Token 有效期长，只用来换新的 Access Token。这样即使 Access Token 泄露，风险窗口也更短。

### httpOnly Cookie

httpOnly Cookie 只能由浏览器自动携带、后端读取，前端 JavaScript 不能直接读。相比 `localStorage`，它更不容易被 XSS 代码直接偷走 token。

### requireCurrentUser

`requireCurrentUser()` 会读取 Cookie、验证 Access Token、查询数据库用户。业务接口只要调用它，就能拿到可信的当前用户。

### 为什么后端不能相信前端传 userId

前端参数可以被用户手动篡改。如果接口相信 `userId`，用户就可能把请求里的 `userId` 改成别人的。P11 改成从 token 得到用户身份。

## 四、关键代码逐段讲解

### `src/lib/auth/current-user.ts`

```ts
const token = await getAccessTokenFromCookies();
const payload = await verifyAccessToken(token);
const user = await prisma.user.findUnique({ where: { id: payload.userId } });
```

这段代码解决“当前请求是谁”的问题。数据流是：Cookie -> JWT payload -> 数据库用户。初学者容易误以为前端传来的 userId 可以相信，但真实项目必须以后端验证过的 token 为准。

### `src/app/api/auth/refresh/route.ts`

```ts
const refreshToken = await getRefreshTokenFromCookies();
const payload = await verifyRefreshToken(refreshToken);
const accessToken = await signAccessToken({ userId: user.id, email: user.email });
await setAccessTokenCookie(accessToken);
```

这段代码负责续签 Access Token。Refresh Token 不访问业务数据，只换新的短期 Access Token。

### `src/app/api/documents/route.ts`

```ts
const user = await requireCurrentUser();
const documents = await prisma.document.findMany({
  where: { userId: user.id },
});
```

这段代码体现用户数据隔离。登录用户只能查到自己的文档。

### `src/lib/request.ts`

```ts
if (response.status === 401 && !isAuthEndpoint(url)) {
  const refreshed = await refreshAccessToken();
  if (refreshed) response = await doFetch(url, { ...options, skipAuthRefresh: true });
}
```

这段代码让普通接口在 Access Token 过期后自动尝试 refresh 并重试一次，避免用户短时间内频繁被踢回登录页。

## 五、本阶段重难点

1. 不能明文存密码。
   - 代码通过 `bcryptjs` 保存 `passwordHash`，登录时只做哈希对比。

2. Token 不能放 localStorage。
   - 本项目用 `httpOnly Cookie`，前端只知道用户信息，不知道 token 明文。

3. 双 Token 的边界要清楚。
   - Access Token 访问业务接口；Refresh Token 只访问 `/api/auth/refresh`。

4. 不能让前端传 userId。
   - 所有业务接口都通过 `requireCurrentUser()` 得到 userId。

5. 数据查询必须绑定 userId。
   - 会话、消息、文档、索引和 RAG 检索都已经按当前用户过滤。

6. 不能破坏原来的 RAG / SSE / 多轮对话。
   - `/api/chat/stream` 仍然保留 SSE，只是在进入流程前先确认当前用户。

## 六、本阶段容易出错的地方

1. 忘记执行 Prisma migration。
   - `User` 表新增 `passwordHash`，必须执行迁移。

2. JWT secret 没配置。
   - `.env.local` 需要新增 `JWT_ACCESS_SECRET` 和 `JWT_REFRESH_SECRET`。

3. Cookie 没设置 httpOnly。
   - `cookies.ts` 统一设置了 `httpOnly: true`。

4. 业务接口忘记 `requireCurrentUser()`。
   - P11 已替换聊天、会话、文档、上传、删除、索引接口。

5. 查询数据时忘记加 `userId`。
   - 文档和会话查询都加了 `userId: user.id`。

6. refresh 无限循环。
   - `request.ts` 对登录、注册、refresh、logout 不做 refresh 重试，并且业务请求只重试一次。

7. SSE 请求没有携带 Cookie。
   - `src/app/chat/page.tsx` 已给流式 `fetch` 加上 `credentials: "include"`。

## 七、我应该怎么运行和测试

1. 安装依赖已经完成：

```bash
npm install bcryptjs jose
```

2. 在 `.env.local` 中补充：

```env
JWT_ACCESS_SECRET="换成一段很长的随机字符串"
JWT_REFRESH_SECRET="换成另一段很长的随机字符串"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
```

3. 执行 Prisma migration：

```bash
npm run prisma:migrate -- --name add_auth_user_password
npm run prisma:generate
```

4. 启动项目：

```bash
npm run dev
```

5. 打开页面：
   - 注册：`http://localhost:3000/register`
   - 登录：`http://localhost:3000/login`
   - 业务页：`http://localhost:3000/chat`

6. 测试点：
   - 注册一个用户后应自动跳转 `/chat`。
   - DevTools Application / Cookies 中应看到 `access_token` 和 `refresh_token`，并且是 httpOnly。
   - 未登录打开 `/chat` 应跳转 `/login`。
   - 登录后上传文档、创建会话，只能在当前账号下看到。
   - 换另一个账号登录，应该看不到上一个账号的文档和会话。

7. 本阶段已验证：

```bash
npm run prisma:generate
npm run lint
npm run build
```

## 八、面试时我应该怎么说

### 30 秒简短版

在 P11 阶段，我把项目从 mock 用户升级成了真实登录用户体系。我实现了注册、登录、退出、获取当前用户和 refresh 续签接口，用 bcrypt 保存密码哈希，用 jose 生成 Access Token 和 Refresh Token，并把 token 写入 httpOnly Cookie。然后我把聊天、会话、文档和 RAG 检索接口都改成从 token 解析当前用户，确保每个用户只能访问自己的数据。

### 1 分钟详细版

在这个阶段，我主要完成了登录鉴权和用户数据隔离。数据库层面，我给 User 表补了 passwordHash，注册时用 bcrypt 对密码做哈希，登录时用 bcrypt compare 校验。鉴权层面，我设计了 Access Token + Refresh Token 双 Token：Access Token 有效期短，用于访问业务接口；Refresh Token 有效期长，只用于 `/api/auth/refresh` 续签。两个 token 都放在 httpOnly Cookie 里，前端 JS 读不到 token。业务接口里，我不再使用 mock-user-001，而是统一调用 requireCurrentUser，从服务端 token 解析当前用户，再用 userId 查询会话、消息、文档和索引数据。

### 追问展开版

如果继续展开，我会强调两个点。第一是安全边界：前端不能传 userId 决定访问谁的数据，因为这个值可以被篡改，所以我让所有受保护接口都从 access_token 解析当前用户。第二是双 Token 的取舍：Access Token 短期减少泄露风险，Refresh Token 长期提升用户体验，但 Refresh Token 不直接访问业务接口，只负责续签。这样即使访问 token 过期，前端请求层也可以自动 refresh 并重试一次，同时不会把 token 暴露到 localStorage。

## 九、面试官可能追问的问题

1. 为什么密码不能明文存？
   - 数据库泄露时明文密码会直接暴露；哈希不可逆，能降低风险。

2. Access Token 和 Refresh Token 有什么区别？
   - Access Token 短期访问业务接口；Refresh Token 长期续签 Access Token。

3. 为什么不用 localStorage 存 token？
   - localStorage 能被前端 JS 读取，XSS 风险更高；httpOnly Cookie 前端读不到。

4. 怎么防止用户访问别人的数据？
   - 后端从 token 解析当前用户，所有查询都加 `userId: user.id`。

5. access token 过期怎么办？
   - 前端请求层遇到 401 时调用 `/api/auth/refresh`，成功后重试一次原请求。

6. refresh token 过期怎么办？
   - 清除 Cookie，要求用户重新登录。

7. P11 怎么和 RAG 结合？
   - RAG 检索只查询当前用户 indexed 文档，避免把别人的知识库内容作为 sources 返回。

## 十、下一阶段要做什么

下一阶段应该进入 **P12：Docker Compose 一键启动**。

P11 已经完成真实用户体系和双 Token 鉴权。P12 要把 Next.js、MySQL、uploads、LanceDB 数据目录通过 Docker Compose 统一编排，让别人拉下项目后可以更容易一键启动和部署。
