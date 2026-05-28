export type RequestOptions = Omit<RequestInit, "body"> & {
  // 组件传普通对象即可，request 内部负责转成 JSON 字符串。
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

// 普通 JSON 接口的统一入口。组件只描述“请求什么”，不用重复写 fetch 细节。
export async function request<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, method = "GET", ...restOptions } = options;

  const response = await fetch(url, {
    ...restOptions,
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    // fetch 不会因为 HTTP 400/500 自动进入 catch，所以这里主动抛错。
    throw new Error(await readErrorMessage(response));
  }

  // 泛型 T 让调用方能得到明确的返回类型，例如 request<ChatResponse>()。
  return (await response.json()) as T;
}
