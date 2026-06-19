import { apiFetch } from "@/lib/api-client";

export interface ApplicationError {
  id: string;
  appId: string | null;
  error: string;
  stack: string | null;
  framework: string;
  environment: string;
  language: string | null;
  runtime: string | null;
  level: string;
  name: string | null;
  fingerprint: string | null;
  handled: boolean | null;
  timestamp: string | null;
  release: string | null;
  url: string | null;
  transaction: string | null;
  user: unknown;
  request: unknown;
  tags: unknown;
  extra: Record<string, unknown>;
  breadcrumbs: unknown;
  contexts: unknown;
  additionalData: unknown;
  href: string | null;
  host: string | null;
  client: string | null;
  repeated: number;
  clientAgent: string | null;
  clientPlatform: string | null;
  createdAt: string | null;
  lastSeenAt: string | null;
}

export interface ApplicationErrorsPage {
  errors: ApplicationError[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface WeeklyErrorCount {
  day: string;
  errors: number;
}

export interface ApplicationErrorsReport {
  thisWeek: WeeklyErrorCount[];
  lastWeek: WeeklyErrorCount[];
}

export interface ApplicationTopAffectedRoute {
  route: string;
  errors: number;
  percentage: number;
}

interface FetchApplicationErrorsOptions {
  appId: string;
  limit: number;
  cursor?: string | null;
  search?: string;
  level?: string;
  environment?: string;
}

export async function fetchApplicationErrors({
  appId,
  limit,
  cursor,
  search,
  level,
  environment,
}: FetchApplicationErrorsOptions): Promise<ApplicationErrorsPage> {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  if (search) {
    params.set("search", search);
  }

  if (level && level !== "all") {
    params.set("level", level);
  }

  if (environment && environment !== "all") {
    params.set("environment", environment);
  }

  const data = await apiFetch<unknown>(
    `/v0.1/applications/${appId}/errors?${params.toString()}`,
  );

  return normalizeApplicationErrorsPage(data);
}

export async function fetchApplicationRecentErrors({
  appId,
  limit,
  cursor,
  search,
  level,
  environment,
}: FetchApplicationErrorsOptions): Promise<ApplicationErrorsPage> {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  if (search) {
    params.set("search", search);
  }

  if (level && level !== "all") {
    params.set("level", level);
  }

  if (environment && environment !== "all") {
    params.set("environment", environment);
  }

  const data = await apiFetch<unknown>(
    `/v0.1/applications/${appId}/errors/recent?${params.toString()}`,
  );

  return normalizeApplicationErrorsPage(data);
}

export async function fetchApplicationErrorsReport(
  appId: string,
): Promise<ApplicationErrorsReport> {
  return await apiFetch<ApplicationErrorsReport>(
    `/v0.1/applications/${encodeURIComponent(appId)}/errors/report`,
  );
}

export async function fetchApplicationsErrorsReport(): Promise<ApplicationErrorsReport> {
  return await apiFetch<ApplicationErrorsReport>(
    "/v0.1/applications/errors/report",
  );
}

export async function fetchApplicationTopAffectedRoutes(
  appId: string,
): Promise<ApplicationTopAffectedRoute[]> {
  const data = await apiFetch<unknown>(
    `/v0.1/applications/${encodeURIComponent(appId)}/errors/top-affected-routes`,
  );

  return normalizeTopAffectedRoutes(data);
}

export async function fetchApplicationErrorDetails({
  appId,
  errorId,
}: {
  appId: string;
  errorId: string;
}): Promise<ApplicationError> {
  const data = await apiFetch<unknown>(
    `/v0.1/applications/${encodeURIComponent(appId)}/errors/${encodeURIComponent(errorId)}`,
  );

  return normalizeApplicationError(data);
}

function normalizeApplicationErrorsPage(data: unknown): ApplicationErrorsPage {
  const record = getPageRecord(data);
  const rawErrors =
    getArray(record.items) ??
    getArray(record.data) ??
    getArray(record.errors) ??
    getArray(data) ??
    [];
  const pageInfo = isRecord(record.pageInfo) ? record.pageInfo : {};
  const pagination = isRecord(record.pagination) ? record.pagination : {};
  const nextCursor =
    getString(record.nextCursor) ??
    getString(record.next_cursor) ??
    getString(pageInfo.nextCursor) ??
    getString(pageInfo.endCursor) ??
    getString(pagination.nextCursor) ??
    null;
  const hasNextPage =
    getBoolean(record.hasNextPage) ??
    getBoolean(record.has_more) ??
    getBoolean(pageInfo.hasNextPage) ??
    getBoolean(pagination.hasNextPage) ??
    Boolean(nextCursor);

  return {
    errors: rawErrors.map(toApplicationError),
    nextCursor,
    hasNextPage,
  };
}

function normalizeApplicationError(data: unknown): ApplicationError {
  const record = getPageRecord(data);
  const rawError =
    isRecord(record.error)
      ? record.error
      : isRecord(record.item)
        ? record.item
        : isRecord(record.data)
          ? record.data
          : record;

  return toApplicationError(rawError);
}

function normalizeTopAffectedRoutes(
  data: unknown,
): ApplicationTopAffectedRoute[] {
  const record = getPageRecord(data);
  const rawRoutes =
    getArray(record.items) ??
    getArray(record.data) ??
    getArray(record.routes) ??
    getArray(record.topAffectedRoutes) ??
    getArray(data) ??
    [];
  const routes = rawRoutes.map(toTopAffectedRoute);
  const maxErrors = Math.max(...routes.map((route) => route.errors), 0);

  return routes
    .filter((route) => route.route)
    .map((route) => ({
      ...route,
      percentage:
        route.percentage > 0
          ? Math.min(100, route.percentage)
          : maxErrors > 0
            ? Math.round((route.errors / maxErrors) * 100)
            : 0,
    }));
}

function getPageRecord(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  if (isRecord(data.data) && !Array.isArray(data.data)) {
    return data.data;
  }

  return data;
}

function toApplicationError(raw: unknown): ApplicationError {
  const error = isRecord(raw) ? raw : {};
  const application = isRecord(error.application) ? error.application : {};
  const framework = isRecord(error.framework) ? error.framework : {};
  const environment = isRecord(error.environment) ? error.environment : {};

  return {
    id: getString(error.id) ?? "",
    appId:
      getString(error.appId) ??
      getString(error.applicationId) ??
      getString(application.id),
    error:
      getString(error.error) ??
      getString(error.message) ??
      getString(error.name) ??
      "Unknown error",
    stack: getString(error.stack),
    framework:
      getString(error.framework) ?? getString(framework.name) ?? "Unknown",
    environment:
      getString(error.environment) ??
      getString(environment.envName) ??
      "unknown",
    language: getString(error.language),
    runtime: getString(error.runtime),
    level: normalizeToken(getString(error.level), "error"),
    name: getString(error.name),
    fingerprint: getString(error.fingerprint),
    handled: getBoolean(error.handled),
    timestamp: getString(error.timestamp),
    release: getString(error.release),
    url: getString(error.url),
    transaction: getString(error.transaction),
    user: error.user ?? null,
    request: error.request ?? null,
    tags: error.tags ?? null,
    extra: isRecord(error.extra) ? error.extra : {},
    breadcrumbs: error.breadcrumbs ?? null,
    contexts: error.contexts ?? null,
    additionalData: error.additionalData ?? null,
    href: getString(error.href),
    host: getString(error.host),
    client: getString(error.client),
    repeated: getNumber(error.repeated),
    clientAgent: getString(error.clientAgent),
    clientPlatform: getString(error.clientPlatform),
    createdAt: getString(error.createdAt),
    lastSeenAt:
      getString(error.lastSeenAt) ??
      getString(error.last_seen_at) ??
      getString(error.createdAt) ??
      getString(error.timestamp),
  };
}

function toTopAffectedRoute(raw: unknown): ApplicationTopAffectedRoute {
  const route = isRecord(raw) ? raw : {};

  return {
    route:
      getString(route.route) ??
      getString(route.path) ??
      getString(route.url) ??
      getString(route.href) ??
      "Unknown route",
    errors:
      getNumber(route.errors) ||
      getNumber(route.errorsCount) ||
      getNumber(route.count) ||
      getNumber(route.total),
    percentage:
      getNumber(route.percentage) ||
      getNumber(route.percent) ||
      getNumber(route.pct),
  };
}

function normalizeToken(value: string | null | undefined, fallback: string) {
  return value?.toLowerCase() ?? fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function getNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
