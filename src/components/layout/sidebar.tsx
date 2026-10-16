import type { Role } from "@prisma/client";
import { Building2 } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 px-6">
        <Building2 className="size-5 text-primary" />
        <span className="font-semibold text-sidebar-foreground">HRMS</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <SidebarNav role={role} />
      </div>
    </aside>
  );
}
