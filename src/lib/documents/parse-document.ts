import path from "path";

import type { SupportedDocumentType } from "@/lib/documents/document-types";
import { parsePdf } from "@/lib/documents/parse-pdf";
import { parseTextFile } from "@/lib/documents/parse-text";

export async function parseDocument(
  relativeFilePath: string,
  fileType: SupportedDocumentType,
) {
  const absoluteFilePath = path.join(
    process.cwd(),
    "uploads",
    path.basename(relativeFilePath),
  );

  // 统一入口负责分发具体解析器。后续如果要支持 DOCX / XLSX，只需要在这里新增分支。
  if (fileType === "pdf") {
    return parsePdf(absoluteFilePath);
  }

  if (fileType === "txt" || fileType === "md") {
    return parseTextFile(absoluteFilePath);
  }

  throw new Error("暂不支持该文件类型。");
}
