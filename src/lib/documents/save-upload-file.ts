import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { getDocumentType } from "@/lib/documents/document-types";

export type SavedUploadFile = {
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: "pdf" | "txt" | "md";
};

function sanitizeFileName(fileName: string) {
  const baseName = path.basename(fileName);
  // 用户上传的文件名来自浏览器，不能完全信任。这里保留常见中文、英文、数字和扩展名符号，其余字符替换成下划线。
  return baseName.replace(/[^\w.\-\u4e00-\u9fa5]/g, "_");
}

function getFileExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return extension || ".txt";
}

export async function saveUploadFile(file: File): Promise<SavedUploadFile> {
  const safeOriginalName = sanitizeFileName(file.name);
  const fileType = getDocumentType(safeOriginalName);

  if (!fileType) {
    throw new Error("暂不支持该文件类型，请上传 PDF、TXT 或 Markdown 文件。");
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const extension = getFileExtension(safeOriginalName);
  const storedFileName = `${randomUUID()}${extension}`;
  const absoluteFilePath = path.join(uploadsDir, storedFileName);
  const relativeFilePath = path.join("uploads", storedFileName);

  // 文件必须落到后端目录里，后端后续才能解析、分块和向量化；只放在前端内存里，刷新页面就丢了。
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absoluteFilePath, buffer);

  return {
    filePath: relativeFilePath,
    fileName: safeOriginalName,
    fileSize: file.size,
    fileType,
  };
}
