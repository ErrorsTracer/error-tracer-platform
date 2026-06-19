// Mock data for ErrorTracer dashboard

export const mockApps = [
  {
    id: "app_1",
    name: "Checkout Service",
    framework: "Next.js",
    environment: "production",
    description: "Main checkout flow and payment processing",
    errorsCount: 342,
    criticalCount: 8,
    lastError: "2026-05-16T09:23:00Z",
    status: "active" as const,
    key: "et_live_ck8x92mf0a1b3c4d5e6f7g8h9",
    createdAt: "2025-11-02T10:00:00Z",
  },
  {
    id: "app_2",
    name: "User Auth API",
    framework: "NestJS",
    environment: "production",
    description: "Authentication and authorization service",
    errorsCount: 187,
    criticalCount: 3,
    lastError: "2026-05-16T08:45:00Z",
    status: "active" as const,
    key: "et_live_ua4k71nq0r2s3t4u5v6w7x8y9",
    createdAt: "2025-10-15T14:00:00Z",
  },
  {
    id: "app_3",
    name: "Dashboard Frontend",
    framework: "React",
    environment: "production",
    description: "Internal admin dashboard",
    errorsCount: 95,
    criticalCount: 1,
    lastError: "2026-05-15T22:10:00Z",
    status: "active" as const,
    key: "et_live_df2m83op0q1r2s3t4u5v6w7x8",
    createdAt: "2025-12-01T09:00:00Z",
  },
  {
    id: "app_4",
    name: "Notification Service",
    framework: "Express",
    environment: "staging",
    description: "Email and push notification delivery",
    errorsCount: 256,
    criticalCount: 5,
    lastError: "2026-05-16T07:30:00Z",
    status: "active" as const,
    key: "et_live_ns6j42kl0m1n2o3p4q5r6s7t8",
    createdAt: "2026-01-10T11:00:00Z",
  },
  {
    id: "app_5",
    name: "Analytics Pipeline",
    framework: "NestJS",
    environment: "production",
    description: "Data ingestion and analytics processing",
    errorsCount: 128,
    criticalCount: 2,
    lastError: "2026-05-16T06:15:00Z",
    status: "active" as const,
    key: "et_live_ap9h15ij0k1l2m3n4o5p6q7r8",
    createdAt: "2026-02-20T16:00:00Z",
  },
  {
    id: "app_6",
    name: "Payment Gateway",
    framework: "Laravel",
    environment: "production",
    description: "Payment processing and webhooks",
    errorsCount: 89,
    criticalCount: 4,
    lastError: "2026-05-15T19:40:00Z",
    status: "active" as const,
    key: "et_live_pg3f67gh0i1j2k3l4m5n6o7p8",
    createdAt: "2025-09-05T08:00:00Z",
  },
  {
    id: "app_7",
    name: "Search API",
    framework: "Express",
    environment: "production",
    description: "Full-text search indexing and querying",
    errorsCount: 67,
    criticalCount: 0,
    lastError: "2026-05-14T14:20:00Z",
    status: "active" as const,
    key: "et_live_sa1d89ef0g1h2i3j4k5l6m7n8",
    createdAt: "2026-03-12T13:00:00Z",
  },
  {
    id: "app_8",
    name: "Media Service",
    framework: "Vue",
    environment: "staging",
    description: "Image and video processing pipeline",
    errorsCount: 120,
    criticalCount: 0,
    lastError: "2026-05-16T04:55:00Z",
    status: "active" as const,
    key: "et_live_ms7b34cd0e1f2g3h4i5j6k7l8",
    createdAt: "2026-04-01T10:00:00Z",
  },
];

export const mockErrors = [
  {
    id: "err_1",
    message: "Cannot read properties of undefined (reading 'map')",
    severity: "critical" as const,
    framework: "React",
    environment: "production",
    occurrences: 1247,
    usersAffected: 832,
    lastSeen: "2026-05-16T09:23:00Z",
    firstSeen: "2026-05-14T03:12:00Z",
    status: "unresolved" as const,
    appId: "app_3",
    appName: "Dashboard Frontend",
    assignee: "User Name",
    stack: `TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (components/UserList.tsx:24:18)
    at renderWithHooks (react-dom.development.js:16305:18)
    at mountIndeterminateComponent (react-dom.development.js:20074:13)
    at beginWork (react-dom.development.js:21587:16)
    at HTMLUnknownElement.callCallback (react-dom.development.js:4164:14)`,
    tags: { feature: "user-management", page: "/admin/users" },
    runtime: "browser",
    language: "typescript",
  },
  {
    id: "err_2",
    message: "ECONNREFUSED: Connection refused to database at 10.0.1.45:5432",
    severity: "critical" as const,
    framework: "NestJS",
    environment: "production",
    occurrences: 89,
    usersAffected: 0,
    lastSeen: "2026-05-16T08:45:00Z",
    firstSeen: "2026-05-16T08:30:00Z",
    status: "investigating" as const,
    appId: "app_2",
    appName: "User Auth API",
    assignee: "Marcus Johnson",
    stack: `Error: ECONNREFUSED: Connection refused to database at 10.0.1.45:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)
    at ConnectionPool.connect (src/database/pool.ts:45:12)
    at AuthService.validateToken (src/auth/auth.service.ts:78:22)
    at AuthGuard.canActivate (src/guards/auth.guard.ts:15:30)`,
    tags: { service: "database", type: "connection" },
    runtime: "node",
    language: "typescript",
  },
  {
    id: "err_3",
    message:
      "PaymentProcessingError: Stripe webhook signature verification failed",
    severity: "error" as const,
    framework: "Laravel",
    environment: "production",
    occurrences: 34,
    usersAffected: 28,
    lastSeen: "2026-05-15T19:40:00Z",
    firstSeen: "2026-05-15T14:22:00Z",
    status: "unresolved" as const,
    appId: "app_6",
    appName: "Payment Gateway",
    assignee: null,
    stack: `App\\Exceptions\\PaymentProcessingError: Stripe webhook signature verification failed
    at App\\Http\\Controllers\\WebhookController->handleStripeWebhook()
    at /var/www/app/Http/Controllers/WebhookController.php:67
    at Illuminate\\Routing\\Controller->callAction()
    at Illuminate\\Routing\\ControllerDispatcher->dispatch()`,
    tags: { feature: "payments", provider: "stripe" },
    runtime: "php",
    language: "php",
  },
  {
    id: "err_4",
    message: "RangeError: Maximum call stack size exceeded",
    severity: "error" as const,
    framework: "React",
    environment: "production",
    occurrences: 567,
    usersAffected: 234,
    lastSeen: "2026-05-16T07:12:00Z",
    firstSeen: "2026-05-13T11:45:00Z",
    status: "unresolved" as const,
    appId: "app_1",
    appName: "Checkout Service",
    assignee: "Alex Rivera",
    stack: `RangeError: Maximum call stack size exceeded
    at CartProvider.calculateTotal (providers/CartProvider.tsx:89:5)
    at CartProvider.calculateTotal (providers/CartProvider.tsx:92:12)
    at CartProvider.calculateTotal (providers/CartProvider.tsx:92:12)
    at CartProvider.calculateTotal (providers/CartProvider.tsx:92:12)`,
    tags: { feature: "checkout", component: "CartProvider" },
    runtime: "browser",
    language: "typescript",
  },
  {
    id: "err_5",
    message: "TimeoutError: Request timed out after 30000ms",
    severity: "warning" as const,
    framework: "Express",
    environment: "production",
    occurrences: 2341,
    usersAffected: 1456,
    lastSeen: "2026-05-16T09:10:00Z",
    firstSeen: "2026-05-10T06:00:00Z",
    status: "unresolved" as const,
    appId: "app_4",
    appName: "Notification Service",
    assignee: null,
    stack: `TimeoutError: Request timed out after 30000ms
    at Timeout._onTimeout (src/services/email.service.ts:112:11)
    at listOnTimeout (internal/timers.js:557:17)
    at processTimers (internal/timers.js:500:7)`,
    tags: { service: "email", provider: "sendgrid" },
    runtime: "node",
    language: "typescript",
  },
  {
    id: "err_6",
    message: "SyntaxError: Unexpected token '<' in JSON at position 0",
    severity: "error" as const,
    framework: "Next.js",
    environment: "production",
    occurrences: 156,
    usersAffected: 89,
    lastSeen: "2026-05-16T06:30:00Z",
    firstSeen: "2026-05-15T09:15:00Z",
    status: "resolved" as const,
    appId: "app_1",
    appName: "Checkout Service",
    assignee: "User Name",
    stack: `SyntaxError: Unexpected token '<' in JSON at position 0
    at JSON.parse (<anonymous>)
    at fetchProducts (lib/api/products.ts:23:28)
    at ProductGrid (components/ProductGrid.tsx:15:9)`,
    tags: { feature: "product-listing", type: "parse-error" },
    runtime: "browser",
    language: "typescript",
  },
  {
    id: "err_7",
    message: "MemoryLimitExceeded: Worker exceeded 512MB memory limit",
    severity: "critical" as const,
    framework: "NestJS",
    environment: "production",
    occurrences: 12,
    usersAffected: 0,
    lastSeen: "2026-05-16T05:00:00Z",
    firstSeen: "2026-05-15T23:00:00Z",
    status: "investigating" as const,
    appId: "app_5",
    appName: "Analytics Pipeline",
    assignee: "Marcus Johnson",
    stack: `MemoryLimitExceeded: Worker exceeded 512MB memory limit
    at Worker.processBatch (src/workers/analytics.worker.ts:67:8)
    at BatchProcessor.run (src/processors/batch.ts:34:15)
    at AnalyticsService.ingestEvents (src/services/analytics.service.ts:89:12)`,
    tags: { service: "analytics", type: "memory" },
    runtime: "node",
    language: "typescript",
  },
  {
    id: "err_8",
    message: "NetworkError: Failed to fetch resource at /api/v2/users",
    severity: "warning" as const,
    framework: "React",
    environment: "staging",
    occurrences: 78,
    usersAffected: 45,
    lastSeen: "2026-05-16T04:55:00Z",
    firstSeen: "2026-05-15T20:00:00Z",
    status: "unresolved" as const,
    appId: "app_3",
    appName: "Dashboard Frontend",
    assignee: null,
    stack: `NetworkError: Failed to fetch resource at /api/v2/users
    at fetchWithRetry (lib/http.ts:34:11)
    at UsersPage.getServerSideProps (pages/users.tsx:12:20)`,
    tags: { feature: "user-management", type: "network" },
    runtime: "browser",
    language: "typescript",
  },
];

export const mockTeamMembers = [
  {
    id: "usr_1",
    name: "User Name",
    email: "First@errortracer.io",
    role: "owner" as const,
    status: "active" as const,
    lastActive: "2026-05-16T09:30:00Z",
    avatar: "SC",
  },
  {
    id: "usr_2",
    name: "Marcus Johnson",
    email: "marcus@errortracer.io",
    role: "admin" as const,
    status: "active" as const,
    lastActive: "2026-05-16T09:15:00Z",
    avatar: "MJ",
  },
  {
    id: "usr_3",
    name: "Alex Rivera",
    email: "alex@errortracer.io",
    role: "developer" as const,
    status: "active" as const,
    lastActive: "2026-05-16T08:45:00Z",
    avatar: "AR",
  },
  {
    id: "usr_4",
    name: "Jamie Park",
    email: "jamie@errortracer.io",
    role: "developer" as const,
    status: "active" as const,
    lastActive: "2026-05-15T18:30:00Z",
    avatar: "JP",
  },
  {
    id: "usr_5",
    name: "Taylor Kim",
    email: "taylor@errortracer.io",
    role: "viewer" as const,
    status: "active" as const,
    lastActive: "2026-05-15T16:00:00Z",
    avatar: "TK",
  },
  {
    id: "usr_6",
    name: "Jordan Lee",
    email: "jordan@errortracer.io",
    role: "developer" as const,
    status: "invited" as const,
    lastActive: null,
    avatar: "JL",
  },
];

export const mockNotifications = [
  {
    id: "notif_1",
    type: "critical" as const,
    title: "Critical error spike detected",
    message: "Checkout Service is experiencing 3x normal error rate",
    time: "2026-05-16T09:20:00Z",
    read: false,
  },
  {
    id: "notif_2",
    type: "critical" as const,
    title: "Database connection failures",
    message: "User Auth API: ECONNREFUSED errors increasing",
    time: "2026-05-16T08:35:00Z",
    read: false,
  },
  {
    id: "notif_3",
    type: "invite" as const,
    title: "New team member",
    message: "Jordan Lee has been invited to the team",
    time: "2026-05-16T07:00:00Z",
    read: false,
  },
  {
    id: "notif_4",
    type: "system" as const,
    title: "Weekly report available",
    message: "Your weekly error summary for May 10-16 is ready",
    time: "2026-05-16T06:00:00Z",
    read: true,
  },
  {
    id: "notif_5",
    type: "resolved" as const,
    title: "Error resolved",
    message: "SyntaxError in Checkout Service marked as resolved",
    time: "2026-05-15T20:00:00Z",
    read: true,
  },
];

export const mockWeeklyErrors = {
  thisWeek: [
    { day: "Mon", errors: 156 },
    { day: "Tue", errors: 203 },
    { day: "Wed", errors: 178 },
    { day: "Thu", errors: 245 },
    { day: "Fri", errors: 198 },
    { day: "Sat", errors: 134 },
    { day: "Sun", errors: 170 },
  ],
  lastWeek: [
    { day: "Mon", errors: 134 },
    { day: "Tue", errors: 167 },
    { day: "Wed", errors: 145 },
    { day: "Thu", errors: 189 },
    { day: "Fri", errors: 156 },
    { day: "Sat", errors: 112 },
    { day: "Sun", errors: 145 },
  ],
};

export const mockDashboardStats = {
  totalApps: 8,
  sharedApps: 8,
  errorsThisWeek: 1284,
  errorChangePercent: 18,
  criticalErrors: 23,
  resolvedErrors: 372,
  unresolvedErrors: 912,
};

export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Never";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs <= 0) return "Just now";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-400";
    case "error":
      return "text-orange-400";
    case "warning":
      return "text-yellow-400";
    case "info":
      return "text-blue-400";
    default:
      return "text-muted-foreground";
  }
}

export function getSeverityBg(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "error":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "warning":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "info":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case "resolved":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "investigating":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "unresolved":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getFrameworkColor(framework: string): string {
  switch (framework) {
    case "React":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    case "Next.js":
      return "bg-foreground/10 text-foreground border-foreground/20";
    case "Vue":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Laravel":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "NestJS":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "Express":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
