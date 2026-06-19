"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface InvitationUser {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

interface InvitationApplication {
  name?: string | null;
}

interface MembershipInvitation {
  id?: string;
  invitationId?: string;
  status?: string | null;
  createdAt?: string | null;
  invitedAt?: string | null;
  sentAt?: string | null;
  applicationName?: string | null;
  appName?: string | null;
  application?: InvitationApplication | null;
  app?: InvitationApplication | null;
  invitedBy?: InvitationUser | null;
  invitedByUser?: InvitationUser | null;
  inviter?: InvitationUser | null;
}

type InvitationAction = "accept" | "reject";

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<MembershipInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingInvitation, setActingInvitation] = useState<string | null>(null);

  async function loadInvitations() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<MembershipInvitation[]>(
        "/v0.1/users/membership-invitations",
      );
      setInvitations(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load membership invitations.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleInvitationAction(
    invitation: MembershipInvitation,
    action: InvitationAction,
  ) {
    const invitationId = getInvitationId(invitation);

    if (!invitationId) {
      toast.error("Unable to find this invitation.");
      return;
    }

    setActingInvitation(invitationId);

    try {
      await apiFetch(
        `/v0.1/users/membership-invitations/${encodeURIComponent(
          invitationId,
        )}/${action}`,
        { method: "PATCH" },
      );

      toast.success(
        action === "accept" ? "Invitation accepted" : "Invitation rejected",
      );
      await loadInvitations();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Unable to ${action} invitation.`,
      );
    } finally {
      setActingInvitation(null);
    }
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    apiFetch<MembershipInvitation[]>("/v0.1/users/membership-invitations")
      .then((data) => {
        if (active) {
          setInvitations(data);
        }
      })
      .catch((error) => {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load membership invitations.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Membership Invitations
        </h1>
        <p className="text-sm text-muted-foreground">
          Review invitations to join application teams.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">
            Invitations ({invitations.length})
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">App Name</TableHead>
              <TableHead className="text-xs">Invitation Time</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Invited By</TableHead>
              <TableHead className="text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading invitations...
                </TableCell>
              </TableRow>
            )}

            {!loading && error && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex min-h-24 flex-col items-center justify-center gap-3 text-center">
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadInvitations}
                    >
                      <RefreshCw className="size-3.5" />
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && !error && invitations.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No membership invitations yet.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              !error &&
              invitations.map((invitation, index) => {
                const invitationId = getInvitationId(invitation);
                const status = invitation.status ?? "pending";
                const isActing = actingInvitation === invitationId;
                const canAct = canActOnInvitation(status) && Boolean(invitationId);

                return (
                  <TableRow key={invitationId ?? index}>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">
                        {getApplicationName(invitation)}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatInvitationTime(invitation)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize",
                          getStatusColor(status),
                        )}
                      >
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {getInviterFirstName(invitation)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!canAct || isActing}
                          onClick={() =>
                            handleInvitationAction(invitation, "accept")
                          }
                        >
                          {isActing ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                          Accept
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!canAct || isActing}
                          onClick={() =>
                            handleInvitationAction(invitation, "reject")
                          }
                        >
                          <X className="size-3.5" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function getInvitationId(invitation: MembershipInvitation) {
  return invitation.id ?? invitation.invitationId ?? null;
}

function getApplicationName(invitation: MembershipInvitation) {
  return (
    invitation.application?.name ??
    invitation.app?.name ??
    invitation.applicationName ??
    invitation.appName ??
    "Unknown app"
  );
}

function getInviterFirstName(invitation: MembershipInvitation) {
  const inviter =
    invitation.invitedBy ?? invitation.invitedByUser ?? invitation.inviter;

  return inviter?.firstName?.trim() || inviter?.email || "Unknown";
}

function formatInvitationTime(invitation: MembershipInvitation) {
  const time = invitation.invitedAt ?? invitation.sentAt ?? invitation.createdAt;

  return time ? formatRelativeTime(time) : "Unknown";
}

function canActOnInvitation(status: string) {
  const normalizedStatus = status.toLowerCase();

  return (
    normalizedStatus === "pending" ||
    normalizedStatus === "invited" ||
    normalizedStatus === "open"
  );
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "accepted":
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "pending":
    case "invited":
    case "open":
      return "border-yellow-500/20 bg-yellow-500/10 text-yellow-400";
    case "rejected":
    case "declined":
    case "revoked":
    case "expired":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}
