"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type OrgNode = {
  id: string;
  firstName: string;
  lastName: string;
  positionTitle: string | null;
  departmentName: string | null;
  children: OrgNode[];
};

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function OrgNodeItem({ node, depth }: { node: OrgNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md py-1.5 pr-2 hover:bg-muted"
        style={{ paddingLeft: `${depth * 1.5}rem` }}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )
          ) : (
            <span className="inline-block size-1 rounded-full bg-border" />
          )}
        </button>
        <Link href={`/employees/${node.id}`} className="flex min-w-0 items-center gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">
              {initials(node.firstName, node.lastName)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">
            {node.firstName} {node.lastName}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {node.positionTitle ?? "—"}
            {node.departmentName ? ` · ${node.departmentName}` : ""}
          </span>
        </Link>
        {hasChildren && (
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {node.children.length} report{node.children.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <OrgNodeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgTree({ roots }: { roots: OrgNode[] }) {
  return (
    <div className="flex flex-col">
      {roots.map((root) => (
        <OrgNodeItem key={root.id} node={root} depth={0} />
      ))}
    </div>
  );
}
