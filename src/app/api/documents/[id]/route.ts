import { unlink } from "fs/promises";
import path from "path";

import { ensureMockUser, MOCK_USER_ID } from "@/lib/auth/mock-user";
import {
  createTextPreview,
  toKnowledgeDocument,
} from "@/lib/documents/document-types";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function findOwnDocument(id: string) {
  await ensureMockUser();

  return prisma.document.findFirst({
    where: {
      id,
      userId: MOCK_USER_ID,
    },
  });
}

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const document = await findOwnDocument(id);

  if (!document) {
    return Response.json({ error: "文档不存在。" }, { status: 404 });
  }

  return Response.json({
    document: {
      ...toKnowledgeDocument(document),
      parsedTextPreview: createTextPreview(document.parsedText, 1200),
    },
  });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const document = await findOwnDocument(id);

  if (!document) {
    return Response.json({ error: "文档不存在。" }, { status: 404 });
  }

  await prisma.document.delete({
    where: { id: document.id },
  });

  // 删除文档时要同时清理数据库记录和本地文件。P6 之后还需要同步删除向量库里的 chunk 数据。
  try {
    await unlink(path.join(process.cwd(), "uploads", path.basename(document.filePath)));
  } catch {
    // 本地文件可能已经被手动删除。这里不让它影响数据库删除结果。
  }

  return Response.json({ success: true });
}
