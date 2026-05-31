import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/lib/auth/current-user";
import { toKnowledgeDocument } from "@/lib/documents/document-types";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const documents = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // 列表接口只返回 preview，不返回完整 parsedText，避免一个大 PDF 让列表响应变得很重。
    return Response.json({
      documents: documents.map(toKnowledgeDocument),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return Response.json({ error: error.message }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "读取文档列表失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
