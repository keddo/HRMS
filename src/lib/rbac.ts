import type { Role } from "@prisma/client";

/** Roles that can manage org-wide HR data (departments, positions, all employees). */
export const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "HR_ADMIN"];

/** Roles that can approve requests for the people who report to them. */
export const MANAGER_ROLES: Role[] = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"];

export function isAdmin(role: Role | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

export function isManagerOrAbove(role: Role | undefined | null): boolean {
  return !!role && MANAGER_ROLES.includes(role);
}

export function canManageEmployee(
  actorRole: Role | undefined | null,
  actorEmployeeId: string | null | undefined,
  targetEmployeeId: string
): boolean {
  if (isAdmin(actorRole)) return true;
  return actorEmployeeId === targetEmployeeId;
}

/** Can the actor approve/reject a leave request made by the employee with the given managerId? */
export function canApproveFor(
  actorRole: Role | undefined | null,
  actorEmployeeId: string | null | undefined,
  targetManagerId: string | null | undefined
): boolean {
  if (isAdmin(actorRole)) return true;
  return !!actorEmployeeId && actorEmployeeId === targetManagerId;
}
