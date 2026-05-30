export type RequestOptions = Omit<RequestInit, "body"> & {
  // 普通 JSON 请求传对象；文件上传请求传 FormData。request 内部会判断该怎么处理。
  body?: unknown;
};

type ErrorResponse = {
  error?: string;
  message?: string;
};

async function readErrorMessage(response: Response) {
  try {
    // 后端错误通常会返回 { error } 或 { message }，这里统一抽出给页面展示。
    const data = (await response.json()) as ErrorResponse;
    return data.error ?? data.message ?? `请求失败：${response.status}`;
  } catch {
    // 如果错误响应不是 JSON，也要给调用方一个可读的兜底错误。
    return `请求失败：${response.status}`;
  }
}

// 普通接口的统一入口。组件只描述“请求什么”，不用重复写 fetch 细节。
export async function request<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, method = "GET", ...restOptions } = options;
  const isFormData = body instanceof FormData;
  const finalHeaders = new Headers(headers);

  if (!isFormData && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...restOptions,
    method,
    headers: finalHeaders,
    // FormData 不能手动设置 application/json，也不能 JSON.stringify。
    // 浏览器会自动生成 multipart/form-data 的 boundary，手动写反而会导致后端读不到文件。
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });

  if (!response.ok) {
    // fetch 不会因为 HTTP 400/500 自动进入 catch，所以这里主动抛错。
    throw new Error(await readErrorMessage(response));
  }

  // 泛型 T 让调用方能得到明确的返回类型，例如 request<DocumentListResponse>()。
  return (await response.json()) as T;
}
