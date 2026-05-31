export type RequestOptions = Omit<RequestInit, "body"> & {
  // JSON 请求传普通对象；文件上传传 FormData。request 内部会自动判断如何处理。
  body?: unknown;
  skipAuthRefresh?: boolean;
};

type ErrorResponse = {
  error?: string;
  message?: string;
};

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as ErrorResponse;
    return data.error ?? data.message ?? `请求失败：${response.status}`;
  } catch {
    return `请求失败：${response.status}`;
  }
}

function isAuthEndpoint(url: string) {
  return url.startsWith("/api/auth/login") ||
    url.startsWith("/api/auth/register") ||
    url.startsWith("/api/auth/refresh") ||
    url.startsWith("/api/auth/logout");
}

async function refreshAccessToken() {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  return response.ok;
}

async function doFetch(url: string, options: RequestOptions) {
  const { body, headers, method = "GET", ...restOptions } = options;
  delete restOptions.skipAuthRefresh;
  const isFormData = body instanceof FormData;
  const finalHeaders = new Headers(headers);

  if (!isFormData && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...restOptions,
    method,
    headers: finalHeaders,
    credentials: restOptions.credentials ?? "include",
    // FormData 不能手动设置 application/json，也不能 JSON.stringify。
    // 浏览器会自动生成 multipart/form-data 的 boundary，手动设置反而会让后端读不到文件。
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });
}

// 普通 JSON 接口的统一入口。组件只关心业务，不需要到处重复写 fetch 细节。
export async function request<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  let response = await doFetch(url, options);

  // P11 增加了双 Token：业务接口遇到 401 时，先尝试用 refresh_token 续签一次 access_token，再重试原请求。
  // 登录、注册、刷新接口自身不做重试，避免无限循环。
  if (
    response.status === 401 &&
    !options.skipAuthRefresh &&
    !isAuthEndpoint(url)
  ) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      response = await doFetch(url, { ...options, skipAuthRefresh: true });
    } else if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
}
