import { assertDatabaseConfigured, prisma } from "@/lib/db";

export const MOCK_USER_ID = "mock-user-001";

// P4 还没有登录注册，为了让 Conversation 和 Document 都能绑定 userId，
// 先固定使用一个 mock 用户。后续登录鉴权阶段会把这里替换成真实当前用户。
export async function ensureMockUser() {
  assertDatabaseConfigured();

  return prisma.user.upsert({
    where: { id: MOCK_USER_ID },
    update: {},
    create: {
      id: MOCK_USER_ID,
      email: "mock-user@example.local",
      name: "本地演示用户",
      passwordHash: "",
    },
  });
}
