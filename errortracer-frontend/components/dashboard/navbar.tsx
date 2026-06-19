"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationCenter } from "./notification-center";
import { CreateAppModal } from "./create-app-modal";
import { useAuth } from "@/components/auth/auth-provider";
import { apiFetch } from "@/lib/api-client";

export interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  avatar: string;
  email: string;
  provider: string;
  isVerified: boolean;
}

export interface UserNotification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  applicationId: string | null;
  createdAt: string;
}

interface NavbarProps {
  onOpenCommandPalette: () => void;
}

export function Navbar({ onOpenCommandPalette }: NavbarProps) {
  const { logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );

  const displayName = getDisplayName(profile);
  const initials = getInitials(displayName, profile?.email);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  async function loadNotifications() {
    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const data = await apiFetch<UserNotification[]>(
        "/v0.1/users/notifications",
      );
      setNotifications(data);
    } catch (error) {
      setNotificationsError(
        error instanceof Error
          ? error.message
          : "Unable to load notifications.",
      );
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function markNotificationAsRead(notificationId: string) {
    const notification = notifications.find(
      (item) => item.id === notificationId,
    );

    if (!notification || notification.isRead) {
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item,
      ),
    );

    try {
      await apiFetch(`/v0.1/users/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
    } catch {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, isRead: false } : item,
        ),
      );
    }
  }

  async function markAllNotificationsAsRead() {
    const unreadNotifications = notifications.filter(
      (notification) => !notification.isRead,
    );

    if (unreadNotifications.length === 0) {
      return;
    }

    const previousNotifications = notifications;

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );

    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          apiFetch(`/v0.1/users/notifications/${notification.id}/read`, {
            method: "PATCH",
          }),
        ),
      );
    } catch {
      setNotifications(previousNotifications);
    }
  }

  useEffect(() => {
    let active = true;

    apiFetch<UserProfile>("/v0.1/users/profile")
      .then((data) => {
        if (active) {
          setProfile(data);
        }
      })
      .finally(() => {
        if (active) {
          setProfileLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleProfileChanged(event: Event) {
      const updatedProfile = (event as CustomEvent<UserProfile>).detail;

      setProfile(updatedProfile);
      setProfileLoading(false);
    }

    window.addEventListener("errortracer:profile-changed", handleProfileChanged);

    return () => {
      window.removeEventListener(
        "errortracer:profile-changed",
        handleProfileChanged,
      );
    };
  }, []);

  useEffect(() => {
    let active = true;

    setNotificationsLoading(true);
    setNotificationsError(null);

    apiFetch<UserNotification[]>("/v0.1/users/notifications")
      .then((data) => {
        if (active) {
          setNotifications(data);
        }
      })
      .catch((error) => {
        if (active) {
          setNotificationsError(
            error instanceof Error
              ? error.message
              : "Unable to load notifications.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setNotificationsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
        {/* Search Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Search className="size-3.5" />
          <span>Search errors, apps...</span>
          <kbd className="ml-4 hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-block">
            <Command className="mr-0.5 inline size-2.5" />K
          </kbd>
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Create App</span>
          </Button>

          {/* Notifications */}
          <NotificationCenter
            open={notifOpen}
            onOpenChange={setNotifOpen}
            notifications={notifications}
            loading={notificationsLoading}
            error={notificationsError}
            onRefresh={loadNotifications}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllRead={markAllNotificationsAsRead}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </NotificationCenter>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="rounded-full">
                <Avatar className="size-7">
                  {profile?.avatar && profile.avatar !== "default.png" && (
                    <AvatarImage src={profile.avatar} alt={displayName} />
                  )}
                  <AvatarFallback className="bg-primary/20 text-xs font-medium text-primary">
                    {profileLoading ? "" : initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">
                  {profileLoading ? "Loading..." : displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profile?.email ?? ""}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 size-3.5" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 size-3.5" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive-foreground"
                onClick={logout}
              >
                <LogOut className="mr-2 size-3.5" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CreateAppModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

function getDisplayName(profile: UserProfile | null) {
  if (!profile) {
    return "User";
  }

  const name = [profile.firstName, profile.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return name || profile.email;
}

function getInitials(name: string, email?: string) {
  const source = name !== "User" ? name : (email ?? name);
  const parts = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "U";
}
