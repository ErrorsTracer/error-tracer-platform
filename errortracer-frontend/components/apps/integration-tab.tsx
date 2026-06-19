"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface AppIntegrationTabProps {
  appId: string;
  appKey: string;
  onAppKeyChange: (appKey: string) => void;
}

interface RotatedCredentials {
  appKey?: string | null;
}

const codeExamples = [
  {
    label: "JavaScript Fetch",
    lang: "javascript",
    code: `fetch("https://api.errortracer.io/v0.1/errors/ingest", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-ErrorTracer-Key": "<APPLICATION_KEY>"
  },
  body: JSON.stringify({
    framework: "react",
    language: "typescript",
    runtime: "browser",
    level: "error",
    message: error.message,
    stack: error.stack,
    environment: "production",
    tags: { feature: "checkout" },
    extra: { component: "CheckoutButton" }
  })
})`,
  },
  {
    label: "React Error Boundary",
    lang: "tsx",
    code: `class ErrorTracerBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    fetch("https://api.errortracer.io/v0.1/errors/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ErrorTracer-Key": "<APPLICATION_KEY>"
      },
      body: JSON.stringify({
        framework: "react",
        level: "error",
        message: error.message,
        stack: error.stack,
        extra: { componentStack: errorInfo.componentStack }
      })
    })
  }
}`,
  },
  {
    label: "cURL",
    lang: "bash",
    code: `curl -X POST https://api.errortracer.io/v0.1/errors/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-ErrorTracer-Key: <APPLICATION_KEY>" \\
  -d '{
    "framework": "generic",
    "level": "error",
    "message": "Something went wrong",
    "environment": "production"
  }'`,
  },
  {
    label: "Node.js / NestJS",
    lang: "typescript",
    code: `import { HttpService } from '@nestjs/axios';

async function reportError(error: Error) {
  await this.httpService.post(
    'https://api.errortracer.io/v0.1/errors/ingest',
    {
      framework: 'nestjs',
      language: 'typescript',
      runtime: 'node',
      level: 'error',
      message: error.message,
      stack: error.stack,
      environment: process.env.NODE_ENV,
    },
    {
      headers: {
        'X-ErrorTracer-Key': process.env.ERRORTRACER_KEY,
      },
    }
  );
}`,
  },
  {
    label: "Laravel / PHP",
    lang: "php",
    code: `use Illuminate\\Support\\Facades\\Http;

Http::withHeaders([
    'X-ErrorTracer-Key' => config('services.errortracer.key'),
])->post('https://api.errortracer.io/v0.1/errors/ingest', [
    'framework' => 'laravel',
    'language' => 'php',
    'runtime' => 'php',
    'level' => 'error',
    'message' => $exception->getMessage(),
    'stack' => $exception->getTraceAsString(),
    'environment' => app()->environment(),
]);`,
  },
];

export function AppIntegrationTab({
  appId,
  appKey,
  onAppKeyChange,
}: AppIntegrationTabProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [activeExample, setActiveExample] = useState(0);

  const maskedKey = appKey.slice(0, 8) + "••••••••••••••••••••";

  function handleCopy() {
    navigator.clipboard.writeText(appKey);
    setCopied(true);
    toast.success("Key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRotate() {
    setRotating(true);

    try {
      const credentials = await apiFetch<RotatedCredentials>(
        `/v0.1/applications/${appId}/credentials/rotate`,
        {
          method: "PUT",
        },
      );

      if (!credentials.appKey) {
        throw new Error("The API did not return a new application key.");
      }

      onAppKeyChange(credentials.appKey);
      setRevealed(false);
      toast.success("Key rotated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to rotate key.",
      );
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Application Key */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground">Application Key</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Use this key to authenticate error ingestion requests.
        </p>

        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border border-border bg-secondary/50 px-3 py-2 font-mono text-sm text-foreground">
            {revealed ? appKey : maskedKey}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRotate}
            disabled={rotating}
            className="text-destructive"
          >
            <RefreshCw
              className={`size-3.5 ${rotating ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
          <AlertTriangle className="size-3.5 shrink-0 text-yellow-400" />
          <p className="text-xs text-yellow-400">
            Rotating this key will invalidate the current key immediately.
            Update all integrations.
          </p>
        </div>
      </div>

      {/* API Endpoint */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground">API Endpoint</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Send error events to this endpoint.
        </p>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            POST
          </span>
          <code className="font-mono text-sm text-foreground">
            https://api.errortracer.io/v0.1/errors/ingest
          </code>
        </div>
        <div className="mt-2">
          <span className="text-xs text-muted-foreground">Header: </span>
          <code className="font-mono text-xs text-foreground">
            X-ErrorTracer-Key: {"<APPLICATION_KEY>"}
          </code>
        </div>
      </div>

      {/* Integration Examples */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-0 overflow-x-auto border-b border-border">
          {codeExamples.map((ex, i) => (
            <button
              key={ex.label}
              onClick={() => setActiveExample(i)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeExample === i
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {ex.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          <pre className="overflow-x-auto rounded-md border border-border bg-background p-4">
            <code className="font-mono text-xs leading-relaxed text-foreground/90">
              {codeExamples[activeExample].code.replace(
                /<APPLICATION_KEY>/g,
                appKey,
              )}
            </code>
          </pre>
        </div>
      </div>

      {/* Payload Example */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium text-foreground">
          Payload Schema
        </h3>
        <pre className="overflow-x-auto rounded-md border border-border bg-background p-4">
          <code className="font-mono text-xs leading-relaxed text-foreground/90">{`{
  "framework": "react",
  "language": "typescript",
  "runtime": "browser",
  "level": "error",
  "message": "Cannot read properties of undefined",
  "stack": "TypeError: Cannot read properties...",
  "environment": "production",
  "tags": {
    "feature": "checkout"
  },
  "extra": {
    "component": "CheckoutButton"
  }
}`}</code>
        </pre>
      </div>
    </div>
  );
}
