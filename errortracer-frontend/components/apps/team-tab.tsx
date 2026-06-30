"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  MoreHorizontal,
  Shield,
  Code,
  Crown,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

const roleConfig = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "text-yellow-400",
    description: "Full access to all features",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    color: "text-blue-400",
    description: "Manage app and members",
  },
  member: {
    label: "Member",
    icon: Code,
    color: "text-emerald-400",
    description: "Debug errors and manage integrations",
  },
} as const;

interface AppTeamTabProps {
  appId: string;
  canManageApp: boolean;
}

interface AppMembership {
  id: string;
  role: keyof typeof roleConfig;
  status: "active" | "invited" | "suspended" | "revoked" | "left";
  joinedAt: string | null;
  createdAt?: string;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

export function AppTeamTab({ appId, canManageApp }: AppTeamTabProps) {
  const [memberships, setMemberships] = useState<AppMembership[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMemberships() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<AppMembership[]>(
        `/v0.1/applications/${appId}/memberships`,
      );
      setMemberships(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to load team members.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageApp) {
      return;
    }

    const emails = inviteEmail
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      return;
    }

    setInviting(true);

    try {
      await apiFetch(`/v0.1/applications/${appId}/invite`, {
        method: "POST",
        body: { emails },
      });
      toast.success(
        emails.length === 1
          ? `Invitation sent to ${emails[0]}`
          : "Invitations sent",
      );
      setInviteEmail("");
      await loadMemberships();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to send invitation.",
      );
    } finally {
      setInviting(false);
    }
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    apiFetch<AppMembership[]>(`/v0.1/applications/${appId}/memberships`)
      .then((data) => {
        if (active) {
          setMemberships(data);
        }
      })
      .catch((error) => {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load team members.",
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
  }, [appId]);

  return (
    <div className="flex flex-col gap-6">
      {canManageApp && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground">
            Invite Team Member
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Invite one or more people by email.
          </p>
          <form
            onSubmit={handleInvite}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="flex flex-1 flex-col gap-2 sm:min-w-64">
              <Label htmlFor="invite-email" className="text-xs">
                Email address
              </Label>
              <Input
                id="invite-email"
                type="text"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={inviting || inviteEmail.trim().length === 0}
            >
              {inviting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserPlus className="size-3.5" />
              )}
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </form>
        </div>
      )}

      {/* Roles */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium text-foreground">
          Role Permissions
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(roleConfig).map(([key, role]) => (
            <div
              key={key}
              className="flex items-start gap-3 rounded-md border border-border bg-secondary/30 p-3"
            >
              <role.icon className={cn("mt-0.5 size-4 shrink-0", role.color)} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {role.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {role.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">Team Members</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Member</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Last Active</TableHead>
              {canManageApp && <TableHead className="w-10 text-xs"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={canManageApp ? 5 : 4}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading members...
                </TableCell>
              </TableRow>
            )}

            {!loading && error && (
              <TableRow>
                <TableCell colSpan={canManageApp ? 5 : 4}>
                  <div className="flex min-h-24 flex-col items-center justify-center gap-3 text-center">
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadMemberships}
                    >
                      <RefreshCw className="size-3.5" />
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && !error && memberships.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canManageApp ? 5 : 4}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No team members or invitations yet.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              !error &&
              memberships.map((member) => {
                const role = roleConfig[member.role] ?? roleConfig.member;
                const name = getMemberName(member);
                const email = member.user?.email ?? "No email";
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-primary/20 text-xs font-medium text-primary">
                            {getInitials(name, email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <role.icon className={cn("size-3", role.color)} />
                        <span className="text-xs font-medium capitalize">
                          {member.role}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize",
                          getStatusColor(member.status),
                        )}
                      >
                        {member.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.joinedAt
                        ? formatRelativeTime(member.joinedAt)
                        : "Invited"}
                    </TableCell>
                    {canManageApp && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Change role</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function getMemberName(member: AppMembership) {
  const firstName = member.user?.firstName?.trim();
  const lastName = member.user?.lastName?.trim();
  const name = [firstName, lastName].filter(Boolean).join(" ");

  return name || member.user?.email || "Invited user";
}

function getInitials(name: string, email: string) {
  const source = name !== "Invited user" ? name : email;
  const parts = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function getStatusColor(status: AppMembership["status"]) {
  switch (status) {
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "invited":
      return "border-yellow-500/20 bg-yellow-500/10 text-yellow-400";
    case "suspended":
      return "border-orange-500/20 bg-orange-500/10 text-orange-400";
    case "revoked":
    case "left":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}
