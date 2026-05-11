import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [jobs, statusGroups] = await Promise.all([
    prisma.job.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.job.groupBy({
      by: ["status"],
      where: { userId },
      _count: { status: true },
    }),
  ]);

  const total = statusGroups.reduce((sum, g) => sum + g._count.status, 0);

  const byStatus = Object.fromEntries(
    (["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED", "GHOSTED"] as JobStatus[]).map(
      (s) => [s, 0]
    )
  ) as Record<JobStatus, number>;

  for (const group of statusGroups) {
    byStatus[group.status] = group._count.status;
  }

  const responded =
    byStatus.SCREENING +
    byStatus.INTERVIEW +
    byStatus.OFFER +
    byStatus.REJECTED;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  return NextResponse.json({
    total,
    byStatus,
    responseRate,
    recentActivity: jobs,
  });
}
