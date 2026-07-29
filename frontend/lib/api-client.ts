const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const DEFAULT_TIMEOUT = 15_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiResponseEnvelope<T> {
  data: T;
  meta?: {
    trace_id?: string;
    timestamp?: string;
    message?: string;
  };
}

async function request<T>(
  endpoint: string,
  options?: RequestInit & { timeout?: number },
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options ?? {};
  const url = `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const errData = body?.error ?? body?.meta ?? {};
      throw new ApiError(
        errData.message ?? `HTTP ${response.status}`,
        response.status,
        errData.code,
        errData.trace_id,
      );
    }

    const body: ApiResponseEnvelope<T> = await response.json();
    return body.data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new ApiError("Request timed out", 408);
    }
    throw new ApiError((err as Error).message, 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  get: <T>(endpoint: string, timeout?: number) =>
    request<T>(endpoint, { method: "GET", timeout }),

  post: <T>(endpoint: string, body?: unknown, timeout?: number) =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      timeout,
    }),

  patch: <T>(endpoint: string, body: unknown, timeout?: number) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
      timeout,
    }),

  delete: <T>(endpoint: string, timeout?: number) =>
    request<T>(endpoint, { method: "DELETE", timeout }),
};
