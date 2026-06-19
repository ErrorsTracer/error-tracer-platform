"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface CreateAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const environments = ["production", "staging", "development"];

interface Framework {
  id: string;
  name: string;
}

interface CreatedApplication {
  id: string;
  name: string;
}

interface ApplicationCredentials {
  appKey?: string | null;
}

export function CreateAppModal({ open, onOpenChange }: CreateAppModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "success">("form");
  const [copied, setCopied] = useState(false);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [frameworksLoading, setFrameworksLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdApp, setCreatedApp] = useState<CreatedApplication | null>(null);
  const [generatedKey, setGeneratedKey] = useState("");
  const [name, setName] = useState("");
  const [frameworkId, setFrameworkId] = useState("");
  const [environment, setEnvironment] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !frameworkId || !environment) {
      toast.error("Fill in the required fields.");
      return;
    }

    setCreating(true);

    try {
      const app = await apiFetch<CreatedApplication>("/v0.1/applications/", {
        method: "POST",
        body: {
          name: name.trim(),
          envName: environment,
          about: description.trim(),
          framework: frameworkId,
        },
      });
      const credentials = await apiFetch<ApplicationCredentials>(
        `/v0.1/applications/${app.id}/credentials`,
      );

      setCreatedApp(app);
      setGeneratedKey(credentials.appKey ?? "");
      setStep("success");
      window.dispatchEvent(new CustomEvent("errortracer:apps-changed"));
      toast.success("Application created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create application.",
      );
    } finally {
      setCreating(false);
    }
  }

  function handleCopy() {
    if (!generatedKey) {
      return;
    }

    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast.success("Key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose(value: boolean) {
    if (!value) {
      setStep("form");
      setCopied(false);
      setCreating(false);
      setCreatedApp(null);
      setGeneratedKey("");
      setName("");
      setFrameworkId("");
      setEnvironment("");
      setDescription("");
    }
    onOpenChange(value);
  }

  function handleViewApplication() {
    if (createdApp) {
      handleClose(false);
      router.push(`/dashboard/apps/${createdApp.id}`);
    }
  }

  useEffect(() => {
    if (!open || frameworks.length > 0) {
      return;
    }

    let active = true;
    setFrameworksLoading(true);

    apiFetch<Framework[]>("/v0.1/applications/frameworks")
      .then((data) => {
        if (active) {
          setFrameworks(data);
        }
      })
      .catch((error) => {
        if (active) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load frameworks.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setFrameworksLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [frameworks.length, open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Application</DialogTitle>
              <DialogDescription>
                Register a new application to start tracking errors.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="app-name">Application Name</Label>
                <Input
                  id="app-name"
                  placeholder="e.g., Checkout Service"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={creating}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Framework</Label>
                <Select
                  value={frameworkId}
                  onValueChange={setFrameworkId}
                  disabled={creating || frameworksLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        frameworksLoading
                          ? "Loading frameworks..."
                          : "Select framework"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworks.map((fw) => (
                      <SelectItem key={fw.id} value={fw.id}>
                        {fw.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Environment</Label>
                <Select
                  value={environment}
                  onValueChange={setEnvironment}
                  disabled={creating}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map((env) => (
                      <SelectItem key={env} value={env}>
                        {env}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="app-desc">Description (optional)</Label>
                <Input
                  id="app-desc"
                  placeholder="Brief description of this application"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={creating}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating || frameworksLoading}>
                  {creating && <Loader2 className="size-3.5 animate-spin" />}
                  {creating ? "Creating..." : "Create Application"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Application Created</DialogTitle>
              <DialogDescription>
                Your application key has been generated. Save it now - you
                won&apos;t be able to see it again.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">
                  Application Key
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-border bg-secondary/50 px-3 py-2 font-mono text-sm text-foreground">
                    {generatedKey || "Key unavailable"}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    disabled={!generatedKey}
                  >
                    {copied ? (
                      <Check className="size-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                <p className="text-xs text-yellow-400">
                  Store this key securely. You&apos;ll need it to configure the
                  ErrorTracer SDK in your application.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Close
              </Button>
              <Button onClick={handleViewApplication}>View Application</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
