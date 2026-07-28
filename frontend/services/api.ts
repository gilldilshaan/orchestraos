const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
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

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};

export const healthApi = {
  system: () => api.get("/health/system"),
  ai: () => api.get("/health/ai"),
  organization: () => api.get("/health/organization"),
};

export const objectivesApi = {
  create: (rawInput: string) =>
    api.post("/objectives", { raw_input: rawInput }),
  get: (id: string) => api.get(`/objectives/${id}`),
  generate: (id: string) => api.post(`/objectives/${id}/generate`),
};

export const plansApi = {
  get: (id: string) => api.get(`/plans/${id}`),
  approve: (id: string, body: Record<string, unknown>) =>
    api.post(`/plans/${id}/approve`, body),
};

export const dashboardApi = {
  get: (objectiveId: string) => api.get(`/dashboard/${objectiveId}`),
};

export const decisionsApi = {
  list: (params?: string) => api.get(`/decisions${params ? `?${params}` : ""}`),
  get: (id: string) => api.get(`/decisions/${id}`),
  approve: (id: string, body: Record<string, unknown>) =>
    api.post(`/decisions/${id}/approve`, body),
  reject: (id: string, body: Record<string, unknown>) =>
    api.post(`/decisions/${id}/reject`, body),
};

export const jobsApi = {
  get: (id: string) => api.get(`/jobs/${id}`),
};
