"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { KeyRound, LogOut, Menu, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { SidebarNav } from "./sidebar-nav";
import { NotificationBell, type NotificationItem } from "@/components/notifications/notification-bell";
import type { Role } from "@prisma/client";

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  HR_ADMIN: "HR Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

export function Topbar({
  name,
  email,
  role,
  notifications,
}: {
  name: string;
  email: string;
  role: Role;
  notifications: NotificationItem[];
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
            <SheetTitle className="flex h-16 items-center gap-2 px-6">
              <Image src="/logo.png" alt="" width={24} height={24} className="rounded-full" />
              HRMS
            </SheetTitle>
            <div className="py-2">
              <SidebarNav role={role} />
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold md:hidden">
          <Image src="/logo.png" alt="" width={22} height={22} className="rounded-full" />
          HRMS
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell notifications={notifications} />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="size-8">
                <AvatarFallback>{initials || <UserIcon className="size-4" />}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs font-normal text-muted-foreground">{email}</span>
                <span className="mt-1 w-fit rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                  {ROLE_LABELS[role]}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account/change-password">
                <KeyRound className="size-4" />
                Change password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
