import { readFile } from "fs/promises";

import pdfParse from "pdf-parse/lib/pdf-parse";

function normalizePdfText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function parsePdf(filePath: string) {
  // pdf-parse 读取的是 PDF 里的“文本层”。如果 PDF 是扫描图片，它不会做 OCR 识别。
  const buffer = await readFile(filePath);
  const result = await pdfParse(buffer);
  const text = normalizePdfText(result.text);

  if (!text) {
    throw new Error("PDF 中没有可解析的文本内容，扫描件需要 OCR，P5 暂不支持。");
  }

  return text;
}
