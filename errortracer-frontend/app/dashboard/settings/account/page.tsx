"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Key,
  Loader2,
  Lock,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  avatar: string;
  email: string;
}

interface AuthSession {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt?: string | null;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  current?: boolean;
}

export default function AccountSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
    null,
  );
  const displayName = getDisplayName(profile);
  const initials = getInitials(displayName, profile?.email);

  useEffect(() => {
    let active = true;

    apiFetch<UserProfile>("/v0.1/users/profile")
      .then((data) => {
        if (!active) {
          return;
        }

        setProfile(data);
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
      })
      .catch((error) => {
        if (active) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load your profile.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingProfile(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    apiFetch<unknown>("/v0.1/auth/sessions")
      .then((data) => {
        if (active) {
          setSessions(normalizeSessions(data));
        }
      })
      .catch((error) => {
        if (active) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load active sessions.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingSessions(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextFirstName = firstName.trim();
    const nextLastName = lastName.trim();

    if (!nextFirstName || !nextLastName) {
      toast.error("First name and last name are required.");
      return;
    }

    setSavingProfile(true);

    try {
      const data = await apiFetch<UserProfile>("/v0.1/users/profile", {
        method: "PATCH",
        body: {
          firstName: nextFirstName,
          lastName: nextLastName,
        },
      });

      setProfile(data);
      setFirstName(data.firstName ?? "");
      setLastName(data.lastName ?? "");
      window.dispatchEvent(
        new CustomEvent("errortracer:profile-changed", { detail: data }),
      );
      toast.success("Profile updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      await apiFetch("/v0.1/users/password", {
        method: "PATCH",
        body: {
          currentPassword,
          newPassword,
          confirmNewPassword,
        },
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update password.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setRevokingSessionId(sessionId);

    try {
      await apiFetch(`/v0.1/auth/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });

      setSessions((currentSessions) =>
        currentSessions.filter((session) => session.id !== sessionId),
      );
      toast.success("Session revoked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to revoke session.",
      );
    } finally {
      setRevokingSessionId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and preferences.
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <User className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Profile Information
          </h3>
        </div>
        <div className="flex items-start gap-6">
          <Avatar className="size-16">
            {profile?.avatar && profile.avatar !== "default.png" && (
              <AvatarImage src={profile.avatar} alt={displayName} />
            )}
            <AvatarFallback className="bg-primary/20 text-lg font-medium text-primary">
              {loadingProfile ? "" : initials}
            </AvatarFallback>
          </Avatar>
          <form
            onSubmit={handleProfileSubmit}
            className="flex flex-1 flex-col gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-first-name" className="text-xs">
                  First name
                </Label>
                <Input
                  id="profile-first-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  disabled={loadingProfile || savingProfile}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-last-name" className="text-xs">
                  Last name
                </Label>
                <Input
                  id="profile-last-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={loadingProfile || savingProfile}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-email" className="text-xs">
                Email
              </Label>
              <Input
                id="profile-email"
                type="email"
                value={profile?.email ?? ""}
                disabled
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="w-fit"
              disabled={loadingProfile || savingProfile}
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </div>
      </div>

      {/* Password */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Change Password
          </h3>
        </div>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="current-pw" className="text-xs">
              Current password
            </Label>
            <Input
              id="current-pw"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={savingPassword}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-pw" className="text-xs">
              New password
            </Label>
            <Input
              id="new-pw"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={savingPassword}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-pw" className="text-xs">
              Confirm new password
            </Label>
            <Input
              id="confirm-pw"
              type="password"
              placeholder="Repeat new password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              disabled={savingPassword}
              autoComplete="new-password"
              required
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="w-fit"
            disabled={savingPassword}
          >
            {savingPassword ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>

      {/* Notifications */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Notification Preferences
          </h3>
        </div>
        <div className="flex flex-col gap-4">
          {[
            {
              title: "Critical error alerts",
              desc: "Get notified about critical errors immediately",
              on: true,
            },
            {
              title: "Weekly digest",
              desc: "Receive a weekly summary of error activity",
              on: true,
            },
            {
              title: "Team activity",
              desc: "Get notified about team member actions",
              on: false,
            },
            {
              title: "Resolved errors",
              desc: "Get notified when errors are resolved",
              on: false,
            },
          ].map((pref) => (
            <div key={pref.title} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">{pref.title}</p>
                <p className="text-xs text-muted-foreground">{pref.desc}</p>
              </div>
              <Switch defaultChecked={pref.on} />
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Security</h3>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">
                Two-factor authentication
              </p>
              <p className="text-xs text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button variant="outline" size="sm">
              Enable 2FA
            </Button>
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm text-foreground">Active sessions</p>
              <p className="text-xs text-muted-foreground">
                Manage your active login sessions
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {loadingSessions ? (
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading sessions...
                </div>
              ) : sessions.length > 0 ? (
                sessions.map((session) => {
                  const isRevoking = revokingSessionId === session.id;

                  return (
                    <div
                      key={session.id}
                      className="flex flex-col gap-3 rounded-md border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm text-foreground">
                            {formatSessionName(session)}
                          </p>
                          {session.current && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatSessionDetails(session)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit shrink-0"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={isRevoking}
                        aria-label={`Revoke session ${formatSessionName(
                          session,
                        )}`}
                      >
                        {isRevoking ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        <span>{isRevoking ? "Revoking..." : "Revoke"}</span>
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  No active sessions found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* API */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Key className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">API Access</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Manage personal API tokens for CI/CD and automation.
        </p>
        <div className="mt-4 flex items-center justify-center rounded-md border border-dashed border-border py-6 text-sm text-muted-foreground">
          Personal API tokens coming soon
        </div>
      </div>
    </div>
  );
}

function getDisplayName(profile: UserProfile | null) {
  if (!profile) {
    return "User";
  }

  return (
    [profile.firstName, profile.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") || profile.email
  );
}

function getInitials(name: string, email?: string) {
  const source = name !== "User" ? name : (email ?? name);
  const parts = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function normalizeSessions(data: unknown): AuthSession[] {
  const rawSessions = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.sessions)
      ? data.sessions
      : isRecord(data) && Array.isArray(data.data)
        ? data.data
        : [];

  return rawSessions
    .map((session) => normalizeSession(session))
    .filter((session): session is AuthSession => Boolean(session));
}

function normalizeSession(session: unknown): AuthSession | null {
  if (!isRecord(session)) {
    return null;
  }

  const rawId = session.id ?? session.sessionId;

  if (typeof rawId !== "string" && typeof rawId !== "number") {
    return null;
  }

  return {
    id: String(rawId),
    userAgent: getOptionalString(session.userAgent),
    ipAddress: getOptionalString(session.ipAddress ?? session.ip),
    createdAt: getOptionalString(session.createdAt),
    lastUsedAt: getOptionalString(
      session.lastUsedAt ?? session.updatedAt ?? session.lastSeenAt,
    ),
    expiresAt: getOptionalString(session.expiresAt),
    current: Boolean(session.current ?? session.isCurrent),
  };
}

function formatSessionName(session: AuthSession) {
  return session.userAgent || "Unknown device";
}

function formatSessionDetails(session: AuthSession) {
  const details = [
    session.ipAddress ? `IP ${session.ipAddress}` : null,
    session.lastUsedAt
      ? `Last active ${formatDateTime(session.lastUsedAt)}`
      : null,
    !session.lastUsedAt && session.createdAt
      ? `Created ${formatDateTime(session.createdAt)}`
      : null,
    session.expiresAt ? `Expires ${formatDateTime(session.expiresAt)}` : null,
  ].filter(Boolean);

  return details.join(" / ") || "Session details unavailable";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}
