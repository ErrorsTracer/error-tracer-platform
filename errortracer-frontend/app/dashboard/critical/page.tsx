"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, AlertTriangle, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import { mockErrors, mockTeamMembers, formatRelativeTime, getSeverityBg, getStatusBg } from "@/lib/mock-data"
import { cn, formatCount } from "@/lib/utils"

export default function CriticalErrorsPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")

  const criticalErrors = mockErrors
    .filter((e) => e.severity === "critical" || e.severity === "error")
    .filter((e) => {
      const matchSearch = e.message.toLowerCase().includes(search.toLowerCase())
      const matchStatus = status === "all" || e.status === status
      return matchSearch && matchStatus
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-red-500/10">
          <AlertTriangle className="size-4.5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Critical Errors</h1>
          <p className="text-sm text-muted-foreground">High severity issues requiring immediate attention.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Open Critical", value: "18", sub: "Unresolved critical issues" },
          { label: "Investigating", value: "5", sub: "Currently being investigated" },
          { label: "Users Impacted", value: formatCount(1832), sub: "Across all critical errors" },
          { label: "Avg Resolution", value: "4.2h", sub: "Mean time to resolve" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-foreground">{stat.value}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search critical errors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unresolved">Unresolved</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Severity</TableHead>
              <TableHead className="text-xs">Error</TableHead>
              <TableHead className="text-xs">Application</TableHead>
              <TableHead className="text-xs text-right">Users</TableHead>
              <TableHead className="text-xs text-right">Events</TableHead>
              <TableHead className="text-xs">First Seen</TableHead>
              <TableHead className="text-xs">Last Seen</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {criticalErrors.map((error) => (
              <TableRow key={error.id} className="cursor-pointer">
                <TableCell>
                  <span className={cn("inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", getSeverityBg(error.severity))}>
                    {error.severity}
                  </span>
                </TableCell>
                <TableCell className="max-w-sm">
                  <Link
                    href={`/dashboard/errors/${error.id}?appId=${error.appId}`}
                    className="group"
                  >
                    <span className="block truncate font-mono text-xs text-foreground group-hover:text-primary">
                      {error.message}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{error.appName}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatCount(error.usersAffected)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatCount(error.occurrences)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatRelativeTime(error.firstSeen)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatRelativeTime(error.lastSeen)}</TableCell>
                <TableCell>
                  <span className={cn("inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize", getStatusBg(error.status))}>
                    {error.status}
                  </span>
                </TableCell>
                <TableCell>
                  {error.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarFallback className="bg-primary/20 text-[9px] font-medium text-primary">
                          {error.assignee.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{error.assignee.split(" ")[0]}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">Unassigned</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
