"use client";

import { useState } from "react";
import Link from "next/link";
import { Bug, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 1000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/login" className="mb-10 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary">
            <Bug className="size-4.5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">
            ErrorTracer
          </span>
        </Link>

        {!submitted ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Reset password
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {"Enter your email and we'll send you a reset link."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@email.com"
                  required
                />
              </div>

              <Button type="submit" className="mt-2 w-full" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
                {!loading && <Mail className="size-4" />}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-6 text-emerald-400" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {
                "We've sent a password reset link to your email address. The link expires in 1 hour."
              }
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
