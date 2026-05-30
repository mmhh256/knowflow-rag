import { readFile } from "fs/promises";

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function parseTextFile(filePath: string) {
  // TXT 和 Markdown 在 P5 都先按普通 UTF-8 文本读取。Markdown 的标题、列表等语法会保留在文本里。
  const rawText = await readFile(filePath, "utf-8");
  const text = normalizeText(rawText);

  if (!text) {
    throw new Error("文件中没有可解析的文本内容。");
  }

  return text;
}
