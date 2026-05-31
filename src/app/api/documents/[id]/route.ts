import { unlink } from "fs/promises";
import path from "path";

import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/lib/auth/current-user";
import {
  createTextPreview,
  toKnowledgeDocument,
} from "@/lib/documents/document-types";
import { prisma } from "@/lib/db";
import { deleteDocumentVectors } from "@/lib/vector/document-vector-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function findOwnDocument(id: string, userId: string) {
  return prisma.document.findFirst({
    where: {
      id,
      userId,
    },
  });
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const document = await findOwnDocument(id, user.id);

    if (!document) {
      return Response.json({ error: "文档不存在。" }, { status: 404 });
    }

    return Response.json({
      document: {
        ...toKnowledgeDocument(document),
        parsedTextPreview: createTextPreview(document.parsedText, 1200),
      },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return Response.json({ error: error.message }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "读取文档详情失败";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const document = await findOwnDocument(id, user.id);

    if (!document) {
      return Response.json({ error: "文档不存在。" }, { status: 404 });
    }

    await prisma.document.delete({
      where: { id: document.id },
    });

    // 删除文档时要同时清理数据库记录、本地文件和 LanceDB 向量，避免后续检索到已删除资料。
    await deleteDocumentVectors(document.id);

    try {
      await unlink(path.join(process.cwd(), "uploads", path.basename(document.filePath)));
    } catch {
      // 本地文件可能已经被手动删除。这里不让它影响数据库删除结果。
    }

    return Response.json({ success: true });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return Response.json({ error: error.message }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "删除文档失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
