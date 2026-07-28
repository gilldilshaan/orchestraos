import type { ApiError } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(error?.error?.message ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};
