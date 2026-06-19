"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bug, Shield, Layers, Users, Cloud, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";

const benefits = [
  {
    icon: Shield,
    title: "Capture production errors",
    description:
      "Automatically ingest and categorize errors from all your applications in real-time.",
  },
  {
    icon: Layers,
    title: "Debug with full context",
    description:
      "Stack traces, request data, user context, and breadcrumbs for every error event.",
  },
  {
    icon: Users,
    title: "Manage apps and teams",
    description:
      "Role-based access control with owner, admin, developer, and viewer permissions.",
  },
  {
    icon: Cloud,
    title: "Self-host or use cloud",
    description:
      "Deploy on your own infrastructure or use our managed cloud hosting.",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm-password") ?? "");

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      await register({
        firstName,
        lastName,
        email,
        password,
      });
      router.replace("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/dashboard" className="mb-10 flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary">
              <Bug className="size-4.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              ErrorTracer
            </span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Start tracing production errors in minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="First Name"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Chen"
                  required
                />
              </div>
            </div>

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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min. 8 characters"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                placeholder="Repeat password"
                required
              />
            </div>

            <Button type="submit" className="mt-2 w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right - Benefits Panel */}
      <div className="hidden flex-1 flex-col justify-center border-l border-border bg-surface px-12 py-12 lg:flex xl:px-20">
        <div className="max-w-md">
          <h2 className="text-xl font-semibold text-foreground">
            Trace production errors before users report them.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ErrorTracer gives your team full visibility into production errors
            with stack traces, request context, and team collaboration tools.
          </p>

          <div className="mt-10 flex flex-col gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="flex gap-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/50">
                  <b.icon className="size-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    {b.title}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {b.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-md border border-border bg-background/50 px-4 py-3">
            <p className="font-mono text-xs text-muted-foreground">
              <span className="text-primary">$</span> npx errortracer init
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground/70">
              {">"} Initializing ErrorTracer SDK...
            </p>
            <p className="font-mono text-xs text-emerald-400/80">
              {">"} Connected. Listening for errors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
