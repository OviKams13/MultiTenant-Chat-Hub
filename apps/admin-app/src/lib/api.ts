const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: unknown;
}

export interface ApiErrorPayload {
  message?: string;
  code?: string;
  details?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    const errorPayload = (payload?.error as ApiErrorPayload | undefined) ?? undefined;
    throw new ApiError(errorPayload?.message ?? "Request failed", response.status, errorPayload);
  }

  if (!payload) {
    throw new ApiError("Invalid server response", response.status);
  }

  return payload.data;
}

export const apiClient = {
  get: <T>(path: string, token?: string) => request<T>(path, { method: "GET" }, token),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }, token),
  put: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }, token),
  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }, token),
  delete: (path: string, token?: string) => request<void>(path, { method: "DELETE" }, token),
};
