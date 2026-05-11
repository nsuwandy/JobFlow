import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

const STATUS_ORDER: JobStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "GHOSTED",
];

const SOURCE_NODE = "Submitted";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Clean up duplicate "initial" rows. Keeps only one per job, breaking ties
  // by id since race-inserted rows can share the same changedAt timestamp.
  await prisma.$executeRaw`
    DELETE FROM "JobStatusHistory"
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY "jobId" ORDER BY "changedAt", id
        ) AS rn
        FROM "JobStatusHistory"
        WHERE "fromStatus" IS NULL
          AND "jobId" IN (SELECT id FROM "Job" WHERE "userId" = ${userId})
      ) t WHERE rn > 1
    )
  `;

  // Lazy backfill — wrapped in a transaction so concurrent requests don't
  // both insert an initial row for the same job.
  await prisma.$transaction(async (tx) => {
    const jobsMissingHistory = await tx.job.findMany({
      where: { userId, history: { none: {} } },
      select: { id: true, status: true, createdAt: true },
    });

    if (jobsMissingHistory.length > 0) {
      await tx.jobStatusHistory.createMany({
        data: jobsMissingHistory.map((j) => ({
          jobId: j.id,
          fromStatus: null,
          toStatus: j.status,
          changedAt: j.createdAt,
        })),
      });
    }
  }, { isolationLevel: "Serializable" });

  // Pull all transitions for this user
  const history = await prisma.jobStatusHistory.findMany({
    where: { job: { userId } },
    select: { fromStatus: true, toStatus: true },
  });

  // Tally transitions
  const linkMap = new Map<string, number>();
  for (const h of history) {
    const from = h.fromStatus ? labelFor(h.fromStatus) : SOURCE_NODE;
    const to = labelFor(h.toStatus);
    if (from === to) continue; // safeguard against same-status logs
    const key = `${from}→${to}`;
    linkMap.set(key, (linkMap.get(key) ?? 0) + 1);
  }

  // Build nodes (only include nodes that appear)
  const nodeSet = new Set<string>();
  for (const key of linkMap.keys()) {
    const [from, to] = key.split("→");
    nodeSet.add(from);
    nodeSet.add(to);
  }

  // Order: Submitted first, then status order
  const orderedNodes = [
    SOURCE_NODE,
    ...STATUS_ORDER.map(labelFor),
  ].filter((n) => nodeSet.has(n));

  const nodes = orderedNodes.map((name) => ({ name }));
  const nameToIndex = new Map(orderedNodes.map((n, i) => [n, i]));

  const links = Array.from(linkMap.entries()).map(([key, value]) => {
    const [from, to] = key.split("→");
    return {
      source: nameToIndex.get(from)!,
      target: nameToIndex.get(to)!,
      value,
    };
  });

  return NextResponse.json({ nodes, links });
}

function labelFor(s: JobStatus): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
