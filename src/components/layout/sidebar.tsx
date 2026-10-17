import type { Role } from "@prisma/client";
import Image from "next/image";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar({
  role,
  companyName,
  logoSrc,
}: {
  role: Role;
  companyName: string;
  logoSrc: string;
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 px-6">
        <Image src={logoSrc} alt="" width={24} height={24} className="rounded-full" />
        <span className="truncate font-semibold text-sidebar-foreground">{companyName}</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <SidebarNav role={role} />
      </div>
    </aside>
  );
}
