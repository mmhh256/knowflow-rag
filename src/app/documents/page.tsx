"use client";

import { FormEvent, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import {
  documentStatusLabels,
  formatFileSize,
  MAX_UPLOAD_SIZE,
} from "@/lib/documents/document-types";
import { request } from "@/lib/request";
import type {
  DocumentDetailResponse,
  DocumentIndexResponse,
  DocumentListResponse,
  DocumentUploadResponse,
  KnowledgeDocument,
} from "@/lib/types/document";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getStatusClass(status: KnowledgeDocument["status"]) {
  if (status === "indexed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "parsed") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  if (status === "parse_failed" || status === "index_failed") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (status === "parsing" || status === "indexing") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function canIndex(status: KnowledgeDocument["status"]) {
  return status === "parsed" || status === "indexed" || status === "index_failed";
}

function getIndexButtonText(document: KnowledgeDocument, isIndexing: boolean) {
  if (isIndexing) {
    return "向量化中";
  }

  return document.status === "indexed" ? "重新索引" : "向量化";
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentDetailResponse["document"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isIndexingId, setIsIndexingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadDocuments() {
    setIsLoading(true);
    setError("");

    try {
      const data = await request<DocumentListResponse>("/api/documents");
      setDocuments(data.documents);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "读取文档失败",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // 页面打开时从数据库加载真实文档列表，刷新后文档状态和 chunkCount 也会保留。
    const timer = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedFile) {
      setError("请先选择一个 PDF、TXT 或 Markdown 文件。");
      return;
    }

    if (selectedFile.size > MAX_UPLOAD_SIZE) {
      setError("文件过大，P5 阶段最大支持 10MB。");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    setIsUploading(true);

    try {
      // 文件上传仍然只负责“保存 + 解析”，P6 的向量化通过单独按钮触发。
      const data = await request<DocumentUploadResponse>(
        "/api/documents/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      setDocuments((currentDocuments) => [
        data.document,
        ...currentDocuments.filter((document) => document.id !== data.document.id),
      ]);
      setSelectedFile(null);
      setMessage(
        data.document.status === "parsed"
          ? "上传并解析成功，下一步可以点击“向量化”。"
          : "文件已上传，但解析失败，请查看详情。",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "上传文档失败",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handlePreview(documentId: string) {
    setError("");
    setMessage("");

    try {
      const data = await request<DocumentDetailResponse>(
        `/api/documents/${documentId}`,
      );
      setSelectedDocument(data.document);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "读取文档详情失败",
      );
    }
  }

  async function handleIndex(document: KnowledgeDocument) {
    setError("");
    setMessage("");
    setIsIndexingId(document.id);

    setDocuments((currentDocuments) =>
      currentDocuments.map((item) =>
        item.id === document.id ? { ...item, status: "indexing" } : item,
      ),
    );

    try {
      // “向量化 / 重新索引”会调用后端读取 parsedText，切 chunk，生成 embedding，再写入 LanceDB。
      const data = await request<DocumentIndexResponse>(
        `/api/documents/${document.id}/index`,
        {
          method: "POST",
        },
      );

      setDocuments((currentDocuments) =>
        currentDocuments.map((item) =>
          item.id === document.id
            ? {
                ...item,
                status: data.document.status,
                chunkCount: data.document.chunkCount,
                indexError: undefined,
              }
            : item,
        ),
      );
      setSelectedDocument((currentDocument) =>
        currentDocument?.id === document.id
          ? {
              ...currentDocument,
              status: data.document.status,
              chunkCount: data.document.chunkCount,
              indexError: undefined,
            }
          : currentDocument,
      );
      setMessage("索引成功，可以用于后续知识库问答。");
    } catch (requestError) {
      const errorMessage =
        requestError instanceof Error ? requestError.message : "文档向量化失败";

      setError(errorMessage);
      setDocuments((currentDocuments) =>
        currentDocuments.map((item) =>
          item.id === document.id
            ? { ...item, status: "index_failed", indexError: errorMessage }
            : item,
        ),
      );
    } finally {
      setIsIndexingId(null);
    }
  }

  async function handleDelete(documentId: string) {
    setError("");
    setMessage("");
    setIsDeletingId(documentId);

    try {
      await request<{ success: boolean }>(`/api/documents/${documentId}`, {
        method: "DELETE",
      });
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== documentId),
      );
      setSelectedDocument((currentDocument) =>
        currentDocument?.id === documentId ? null : currentDocument,
      );
      setMessage("文档已删除。");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "删除文档失败",
      );
    } finally {
      setIsDeletingId(null);
    }
  }

  return (
    <AppShell>
      <div className="h-full overflow-y-auto bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-500">知识库</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              文档管理
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              P6 阶段在 P5 的解析结果上继续：把 parsedText 切成 chunk，生成
              embedding，并写入 LanceDB。当前仍不做 RAG 问答。
            </p>
          </div>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
            <form
              onSubmit={handleUpload}
              className="grid gap-4 lg:grid-cols-[1fr_auto]"
            >
              <div>
                <label
                  htmlFor="document-file"
                  className="block text-sm font-semibold text-slate-900"
                >
                  上传文档
                </label>
                <p className="mt-1 text-sm text-slate-500">
                  支持 PDF、TXT、MD，最大 {formatFileSize(MAX_UPLOAD_SIZE)}。
                </p>
                <input
                  id="document-file"
                  type="file"
                  accept=".pdf,.txt,.md,.markdown"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                  className="mt-3 block w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                />
                {selectedFile ? (
                  <p className="mt-2 text-xs text-slate-500">
                    已选择：{selectedFile.name} · {formatFileSize(selectedFile.size)}
                  </p>
                ) : null}
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="h-11 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isUploading ? "上传解析中..." : "上传并解析"}
                </button>
              </div>
            </form>

            {message ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  文档列表
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  chunk 数量表示文档被切成了多少个可检索片段。
                </p>
              </div>
              <button
                type="button"
                onClick={loadDocuments}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                刷新
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-sm text-slate-500">正在加载文档...</div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">
                当前知识库为空，请先上传 PDF、TXT 或 Markdown 文档。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-5 py-3">文件名</th>
                      <th className="px-5 py-3">类型</th>
                      <th className="px-5 py-3">大小</th>
                      <th className="px-5 py-3">状态</th>
                      <th className="px-5 py-3">chunk 数</th>
                      <th className="px-5 py-3">上传时间</th>
                      <th className="px-5 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map((document) => {
                      const isIndexing = isIndexingId === document.id;

                      return (
                        <tr key={document.id} className="text-slate-700">
                          <td className="max-w-xs px-5 py-4 font-medium text-slate-950">
                            <span className="line-clamp-2">
                              {document.fileName}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 uppercase">
                            {document.fileType}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            {formatFileSize(document.fileSize)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`rounded-md px-2 py-1 text-xs font-medium ring-1 ${getStatusClass(
                                document.status,
                              )}`}
                            >
                              {documentStatusLabels[document.status]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            {document.chunkCount}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            {formatDate(document.createdAt)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handlePreview(document.id)}
                                className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                              >
                                查看详情
                              </button>
                              {canIndex(document.status) ? (
                                <button
                                  type="button"
                                  disabled={isIndexing}
                                  onClick={() => handleIndex(document)}
                                  className="rounded-md border border-sky-200 px-2 py-1 text-xs text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {getIndexButtonText(document, isIndexing)}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                disabled={isDeletingId === document.id}
                                onClick={() => handleDelete(document.id)}
                                className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isDeletingId === document.id ? "删除中" : "删除"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {selectedDocument ? (
            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    文档详情
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedDocument.fileName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDocument(null)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
                >
                  关闭
                </button>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-slate-500">类型</dt>
                  <dd className="mt-1 font-medium uppercase text-slate-900">
                    {selectedDocument.fileType}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">大小</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {formatFileSize(selectedDocument.fileSize)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">状态</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {documentStatusLabels[selectedDocument.status]}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">chunk 数</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {selectedDocument.chunkCount}
                  </dd>
                </div>
              </dl>

              {selectedDocument.parseError ? (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {selectedDocument.parseError}
                </div>
              ) : null}

              {selectedDocument.indexError ? (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {selectedDocument.indexError}
                </div>
              ) : null}

              <div className="mt-4 rounded-lg bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  文本预览
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedDocument.parsedTextPreview ||
                    selectedDocument.preview ||
                    "暂无可预览内容。"}
                </p>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
