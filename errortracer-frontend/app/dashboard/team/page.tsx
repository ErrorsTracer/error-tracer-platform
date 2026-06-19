"use client"

import { useEffect, useState } from "react"
import {
  UserPlus,
  MoreHorizontal,
  Shield,
  Code,
  Eye,
  Crown,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { mockTeamMembers, formatRelativeTime } from "@/lib/mock-data"
import { apiFetch } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const roleConfig = {
  owner: { label: "Owner", icon: Crown, color: "text-yellow-400" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-400" },
  developer: { label: "Developer", icon: Code, color: "text-emerald-400" },
  viewer: { label: "Viewer", icon: Eye, color: "text-muted-foreground" },
} as const

interface ApplicationOption {
  id: string
  name: string
}

export default function TeamPage() {
  const [inviteEmail, setInviteEmail] = useState("")
  const [selectedApplicationId, setSelectedApplicationId] = useState("")
  const [applications, setApplications] = useState<ApplicationOption[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [applicationsError, setApplicationsError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  async function loadApplications(shouldUpdate = () => true) {
    setApplicationsLoading(true)
    setApplicationsError(null)

    try {
      const data = await apiFetch<ApplicationOption[]>("/v0.1/applications/")

      if (shouldUpdate()) {
        setApplications(data)
        setSelectedApplicationId((current) => current || data[0]?.id || "")
      }
    } catch (error) {
      if (shouldUpdate()) {
        setApplicationsError(
          error instanceof Error ? error.message : "Unable to load applications.",
        )
      }
    } finally {
      if (shouldUpdate()) {
        setApplicationsLoading(false)
      }
    }
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const email = inviteEmail.trim()

    if (!email || !selectedApplicationId) {
      return
    }

    setInviting(true)

    try {
      await apiFetch(
        `/v0.1/applications/${encodeURIComponent(selectedApplicationId)}/invite`,
        {
          method: "POST",
          body: { emails: [email] },
        },
      )

      toast.success(`Invitation sent to ${email}`)
      setInviteEmail("")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to send invitation.",
      )
    } finally {
      setInviting(false)
    }
  }

  useEffect(() => {
    let active = true

    loadApplications(() => active)

    return () => {
      active = false
    }
  }, [])

  const canInvite =
    inviteEmail.trim().length > 0 &&
    selectedApplicationId.length > 0 &&
    !applicationsLoading &&
    !applicationsError &&
    !inviting

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground">Manage team members and permissions.</p>
      </div>

      {/* Invite */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground">Invite Team Member</h3>
        <p className="mb-4 text-xs text-muted-foreground">Add collaborators to an application.</p>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-2 sm:min-w-64">
            <Label htmlFor="team-invite-email" className="text-xs">Email address</Label>
            <Input
              id="team-invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviting}
            />
          </div>
          <div className="flex min-w-56 flex-col gap-2">
            <Label className="text-xs">Application</Label>
            <Select
              value={selectedApplicationId}
              onValueChange={setSelectedApplicationId}
              disabled={applicationsLoading || inviting || applications.length === 0}
            >
              <SelectTrigger className="w-56">
                <SelectValue
                  placeholder={
                    applicationsLoading ? "Loading apps..." : "Select application"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {applications.map((application) => (
                  <SelectItem key={application.id} value={application.id}>
                    {application.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm" disabled={!canInvite}>
            {inviting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            {inviting ? "Sending..." : "Send Invite"}
          </Button>
        </form>
        {applicationsError && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{applicationsError}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Retry applications"
              onClick={() => loadApplications()}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">Members ({mockTeamMembers.length})</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Member</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Last Active</TableHead>
              <TableHead className="w-10 text-xs"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTeamMembers.map((member) => {
              const role = roleConfig[member.role]
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        <AvatarFallback className="bg-primary/20 text-xs font-medium text-primary">
                          {member.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <role.icon className={cn("size-3", role.color)} />
                      <span className="text-xs font-medium capitalize">{member.role}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize",
                      member.status === "active"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                    )}>
                      {member.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRelativeTime(member.lastActive)}
                  </TableCell>
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
                        <DropdownMenuItem className="text-destructive">Remove member</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
