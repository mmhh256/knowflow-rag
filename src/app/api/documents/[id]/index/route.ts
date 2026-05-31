import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { indexDocument } from "@/lib/rag/index-document";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const user = await requireCurrentUser();

    // 只允许索引当前用户自己的文档。索引结果会写入 LanceDB，必须和数据库权限保持一致。
    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!document) {
      return Response.json({ error: "文档不存在。" }, { status: 404 });
    }

    const result = await indexDocument({ documentId: id, userId: user.id });

    return Response.json({
      document: {
        id: document.id,
        fileName: document.fileName,
        status: "indexed",
        chunkCount: result.chunkCount,
      },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return Response.json({ error: error.message }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "文档向量化失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
