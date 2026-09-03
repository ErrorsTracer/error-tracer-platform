"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AppWindow,
  LayoutDashboard,
  AlertTriangle,
  FileBarChart,
  Users,
  Settings,
  Bug,
  Search,
  MailPlus,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { mockApps, mockErrors } from "@/lib/mock-data"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  function navigate(path: string) {
    router.push(path)
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search apps, errors, navigate..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/dashboard")}>
            <LayoutDashboard className="mr-2 size-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate("/dashboard/apps")}>
            <AppWindow className="mr-2 size-4" />
            My Apps
          </CommandItem>
          <CommandItem onSelect={() => navigate("/dashboard/critical")}>
            <AlertTriangle className="mr-2 size-4" />
            Critical Errors
          </CommandItem>
           
          <CommandItem onSelect={() => navigate("/dashboard/invitations")}>
            <MailPlus className="mr-2 size-4" />
            Invitations
          </CommandItem>
          <CommandItem onSelect={() => navigate("/dashboard/settings/account")}>
            <Settings className="mr-2 size-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        
      </CommandList>
    </CommandDialog>
  )
}
