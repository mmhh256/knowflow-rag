import {
  MAX_UPLOAD_SIZE,
  toKnowledgeDocument,
} from "@/lib/documents/document-types";
import { parseDocument } from "@/lib/documents/parse-document";
import { saveUploadFile } from "@/lib/documents/save-upload-file";
import { ensureMockUser, MOCK_USER_ID } from "@/lib/auth/mock-user";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "文档上传失败";
}

export async function POST(req: Request) {
  try {
    // FormData 是浏览器上传文件时常用的数据格式，里面可以同时放文件和普通字段。
    // 文件上传必须在后端处理，因为 API Route 才能把文件写入服务器目录并保存数据库记录。
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || !file.name) {
      return Response.json({ error: "请选择要上传的文件。" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return Response.json(
        { error: "文件过大，P5 阶段最大支持 10MB。" },
        { status: 400 },
      );
    }

    await ensureMockUser();
    const savedFile = await saveUploadFile(file);

    let document = await prisma.document.create({
      data: {
        userId: MOCK_USER_ID,
        fileName: savedFile.fileName,
        fileType: savedFile.fileType,
        fileSize: savedFile.fileSize,
        filePath: savedFile.filePath,
        status: "uploaded",
      },
    });

    // 状态流转能让前端知道文档当前处理到哪一步：已上传 -> 解析中 -> 已解析 / 解析失败。
    document = await prisma.document.update({
      where: { id: document.id },
      data: { status: "parsing" },
    });

    try {
      const parsedText = await parseDocument(savedFile.filePath, savedFile.fileType);

      document = await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "parsed",
          parsedText,
          parseError: null,
          // P5 只做解析，不做分块，所以 chunkCount 仍然保持 0。
          chunkCount: 0,
        },
      });
    } catch (parseError) {
      document = await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "parse_failed",
          parseError: getErrorMessage(parseError),
        },
      });
    }

    return Response.json({ document: toKnowledgeDocument(document) });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
