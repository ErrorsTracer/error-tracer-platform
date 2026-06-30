"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface AppSettingsTabProps {
  app: {
    id: string;
    name: string;
    environment: string;
    description: string;
    productionMode: boolean;
  };
  canManageApp: boolean;
  onProductionModeChange: (productionMode: boolean) => void;
}

interface ProductionModeResponse {
  production?: boolean | null;
  productionMode?: boolean | null;
  isProduction?: boolean | null;
  enabled?: boolean | null;
}

export function AppSettingsTab({
  app,
  canManageApp,
  onProductionModeChange,
}: AppSettingsTabProps) {
  const router = useRouter();
  const [appName, setAppName] = useState(app.name);
  const [productionMode, setProductionMode] = useState(app.productionMode);
  const [updatingProductionMode, setUpdatingProductionMode] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const canDelete = deleteConfirmation === app.name;

  async function handleDelete() {
    if (!canManageApp || !canDelete) {
      return;
    }

    setDeleting(true);

    try {
      await apiFetch<void>(`/v0.1/applications/${app.id}`, {
        method: "DELETE",
      });
      toast.success("Application deleted");
      router.replace("/dashboard/apps");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete application.",
      );
      setDeleting(false);
    }
  }

  async function handleProductionModeChange(checked: boolean) {
    if (!canManageApp) {
      return;
    }

    const previousValue = productionMode;

    setProductionMode(checked);
    onProductionModeChange(checked);
    setUpdatingProductionMode(true);

    try {
      const data = await apiFetch<ProductionModeResponse | void>(
        `/v0.1/applications/${app.id}/credentials/production`,
        {
          method: "PUT",
        },
      );
      const nextValue = getProductionModeFromResponse(data) ?? checked;

      setProductionMode(nextValue);
      onProductionModeChange(nextValue);
      toast.success(
        nextValue ? "Production mode enabled" : "Production mode disabled",
      );
    } catch (error) {
      setProductionMode(previousValue);
      onProductionModeChange(previousValue);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update production mode.",
      );
    } finally {
      setUpdatingProductionMode(false);
    }
  }

  function handleDeleteOpenChange(open: boolean) {
    if (!canManageApp || deleting) {
      return;
    }

    setDeleteOpen(open);

    if (!open) {
      setDeleteConfirmation("");
    }
  }

  if (!canManageApp) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* General */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground">
          General Settings
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Basic application configuration.
        </p>
        <div className="flex flex-col gap-4 max-w-md">
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-name" className="text-xs">
              Application Name
            </Label>
            <Input
              id="settings-name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
            />
          </div>

          <Button
            size="sm"
            className="w-fit"
            onClick={() => toast.success("Settings saved")}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Credentials */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground">Credentials</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Control how this application's ingestion credentials behave.
        </p>
        <div className="flex max-w-md items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Production mode</p>
            <p className="text-xs text-muted-foreground">
              Toggle production ingestion mode for this application key.
            </p>
          </div>
          <Switch
            checked={productionMode}
            onCheckedChange={handleProductionModeChange}
            disabled={updatingProductionMode}
          />
        </div>
      </div>

      {/* Error Rules */}
      {/* <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground">
          Critical Error Rules
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Configure what triggers critical error alerts.
        </p>
        <div className="flex flex-col gap-4 max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">
                Auto-escalate repeating errors
              </p>
              <p className="text-xs text-muted-foreground">
                Escalate to critical after 100+ occurrences in 1 hour
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">
                Alert on new error types
              </p>
              <p className="text-xs text-muted-foreground">
                Notify when a previously unseen error is reported
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">User impact alerts</p>
              <p className="text-xs text-muted-foreground">
                Alert when errors affect more than 50 users
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </div> */}

      {/* Alerts */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground">Alert Settings</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Configure where alerts are sent.
        </p>
        <div className="flex flex-col gap-4 max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Email notifications</p>
              <p className="text-xs text-muted-foreground">
                Send alerts to team email
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Slack integration</p>
              <p className="text-xs text-muted-foreground">
                Post alerts to Slack channel
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </div>

      {/* Webhooks Placeholder */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground">Webhooks</h3>
        <p className="text-xs text-muted-foreground">
          Send error events to external services via webhooks.
        </p>
        <div className="mt-4 flex items-center justify-center rounded-md border border-dashed border-border py-6 text-sm text-muted-foreground">
          Webhook configuration coming soon
        </div>
      </div>

      {/* Retention Placeholder */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground">Data Retention</h3>
        <p className="text-xs text-muted-foreground">
          Configure how long error data is stored.
        </p>
        <div className="mt-4 flex items-center justify-center rounded-md border border-dashed border-border py-6 text-sm text-muted-foreground">
          Retention settings coming soon
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Irreversible actions. Proceed with caution.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-3.5" />
          Delete Application
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete application</DialogTitle>
            <DialogDescription>
              This permanently deletes {app.name}, its memberships, credentials,
              and error data.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Type{" "}
                <span className="font-mono font-medium text-foreground">
                  {app.name}
                </span>{" "}
                to confirm deletion.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-confirmation" className="text-xs">
              Application name
            </Label>
            <Input
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder={app.name}
              disabled={deleting}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={!canDelete || deleting}
            >
              <Trash2 className="size-3.5" />
              {deleting ? "Deleting..." : "Delete application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getProductionModeFromResponse(data: ProductionModeResponse | void) {
  if (!data) {
    return null;
  }

  return (
    data.productionMode ??
    data.isProduction ??
    data.production ??
    data.enabled ??
    null
  );
}
