"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bug, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await login({ email, password });
      router.replace("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left - Brand Panel */}
      <div className="hidden flex-1 flex-col justify-between border-r border-border bg-surface px-12 py-10 lg:flex xl:px-20">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary">
            <Bug className="size-4.5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">
            ErrorTracer
          </span>
        </Link>

        <div className="max-w-md">
          <h2 className="text-2xl font-semibold leading-tight text-foreground">
            Production error debugging for teams that ship fast.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Monitor, trace, and resolve errors across all your applications. Get
            full stack traces, request context, and team collaboration in one
            platform.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { value: "1.2M+", label: "Errors tracked" },
              { value: "99.9%", label: "Uptime SLA" },
              { value: "< 50ms", label: "Ingestion latency" },
              { value: "8", label: "Frameworks supported" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-md border border-border bg-background/50 px-4 py-3"
              >
                <p className="font-mono text-lg font-semibold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/60">
          Open-source error tracing platform
        </p>
      </div>

      {/* Right - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary">
              <Bug className="size-4.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              ErrorTracer
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to your ErrorTracer account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="user@email.com"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/reset-password"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                required
              />
            </div>

            <Button type="submit" className="mt-2 w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {"Don't have an account? "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
