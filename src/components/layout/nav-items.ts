import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  Network,
  CalendarClock,
  Clock,
  Wallet,
  Target,
  Briefcase,
  ClipboardCheck,
  Package,
  Megaphone,
  BarChart3,
  ShieldAlert,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_ROLES, MANAGER_ROLES } from "@/lib/rbac";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Org Chart", href: "/org-chart", icon: Network },
  { label: "Leave", href: "/leave", icon: CalendarClock },
  { label: "Attendance", href: "/attendance", icon: Clock },
  { label: "Payroll", href: "/payroll", icon: Wallet },
  { label: "Performance", href: "/performance", icon: Target },
  { label: "Recruitment", href: "/recruitment", icon: Briefcase, roles: ADMIN_ROLES },
  { label: "Onboarding", href: "/onboarding", icon: ClipboardCheck, roles: ADMIN_ROLES },
  { label: "Assets", href: "/assets", icon: Package, roles: ADMIN_ROLES },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ADMIN_ROLES },
  { label: "Audit Log", href: "/audit-log", icon: ShieldAlert, roles: ADMIN_ROLES },
  { label: "Settings", href: "/settings", icon: Settings, roles: MANAGER_ROLES },
];

export const ADD_EMPLOYEE_ROLES = ADMIN_ROLES;
