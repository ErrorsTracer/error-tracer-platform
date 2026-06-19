import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth-token";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4973";
const API_VERSION = "/v0.1";

type JsonBody = object;

interface ApiFetchInit extends Omit<RequestInit, "body"> {
  auth?: boolean;
  body?: BodyInit | JsonBody | null;
  retryOnUnauthorized?: boolean;
}

interface AccessTokenResponse {
  accessToken?: string;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let refreshPromise: Promise<string | null> | null = null;
let authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

export async function refreshAccessToken(options?: {
  notifyOnFailure?: boolean;
}) {
  if (!refreshPromise) {
    refreshPromise = requestAccessTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  const token = await refreshPromise;

  if (!token && options?.notifyOnFailure !== false) {
    authFailureHandler?.();
  }

  return token;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: ApiFetchInit = {},
): Promise<T> {
  return request<T>(path, init, true);
}

async function request<T>(
  path: string,
  init: ApiFetchInit,
  canRetryUnauthorized: boolean,
): Promise<T> {
  const auth = init.auth !== false;
  const headers = new Headers(init.headers);
  const token = getAccessToken();

  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const body = normalizeBody(init.body, headers);
  const response = await fetch(toApiUrl(path), {
    ...init,
    body,
    headers,
    credentials: init.credentials ?? "include",
  });

  if (
    auth &&
    response.status === 401 &&
    canRetryUnauthorized &&
    init.retryOnUnauthorized !== false
  ) {
    const refreshedToken = await refreshAccessToken();

    if (refreshedToken) {
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);

      return request<T>(
        path,
        { ...init, headers: retryHeaders, retryOnUnauthorized: false },
        false,
      );
    }

    throw await createApiError(response);
  }

  if (!response.ok) {
    throw await createApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await readResponseBody<T>(response);
}

async function requestAccessTokenRefresh() {
  try {
    const response = await fetch(toApiUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      clearAccessToken();
      return null;
    }

    const data = (await response.json()) as AccessTokenResponse;
    const token = data.accessToken ?? null;
    setAccessToken(token);

    return token;
  } catch {
    clearAccessToken();
    return null;
  }
}

function toApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const versionedPath = normalizedPath.startsWith(API_VERSION)
    ? normalizedPath
    : `${API_VERSION}${normalizedPath}`;

  return `${baseUrl}${versionedPath}`;
}

function normalizeBody(body: ApiFetchInit["body"], headers: Headers) {
  if (!body || isBodyInit(body)) {
    return body as BodyInit | null | undefined;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return JSON.stringify(body);
}

function isBodyInit(body: ApiFetchInit["body"]) {
  return (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams ||
    body instanceof ReadableStream
  );
}

async function createApiError(response: Response) {
  const data = await readErrorBody(response);
  const message =
    getErrorMessage(data) || response.statusText || "Request failed";

  return new ApiError(response.status, message, data);
}

async function readErrorBody(response: Response) {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return await response.json().catch(() => null);
  }

  return await response.text().catch(() => null);
}

async function readResponseBody<T>(response: Response) {
  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return JSON.parse(text) as T;
  }

  return text as T;
}

function getErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  const message = record.message ?? record.error;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === "string").join(", ");
  }

  return null;
}
