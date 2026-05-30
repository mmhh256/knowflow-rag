import { MOCK_USER_ID, ensureMockUser } from "@/lib/auth/mock-user";
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
    // 索引接口单独拆出来，是为了让上传解析和向量化分开调试。
    // P6 只负责“文档 -> chunk -> embedding -> LanceDB”，不负责问答。
    await ensureMockUser();

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: MOCK_USER_ID,
      },
    });

    if (!document) {
      return Response.json({ error: "文档不存在。" }, { status: 404 });
    }

    const result = await indexDocument(id);

    return Response.json({
      document: {
        id: document.id,
        fileName: document.fileName,
        status: "indexed",
        chunkCount: result.chunkCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "文档向量化失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
