import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { CreateAnnouncementDialog } from "@/components/announcements/create-announcement-dialog";
import { AnnouncementFeed, type AnnouncementRow } from "@/components/announcements/announcement-feed";

export default async function AnnouncementsPage() {
  const session = await auth();
  const canManage = isAdmin(session?.user.role);

  const announcements = await prisma.announcement.findMany({
    include: { author: { include: { employee: true } } },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
  });

  const rows: AnnouncementRow[] = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    authorName: a.author.employee
      ? `${a.author.employee.firstName} ${a.author.employee.lastName}`
      : a.author.email,
    pinned: a.pinned,
    publishedAt: a.publishedAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">Company-wide news and updates.</p>
        </div>
        {canManage && <CreateAnnouncementDialog />}
      </div>

      <AnnouncementFeed announcements={rows} canManage={canManage} />
    </div>
  );
}
