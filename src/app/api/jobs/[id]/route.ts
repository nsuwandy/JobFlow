import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JobStatus, Prisma } from "@prisma/client";
import {
  PIPELINE_STATUSES,
  TERMINAL_STATUSES,
  isTerminal,
  pipelineRank,
} from "@/lib/types";

async function getJobOrFail(id: string, userId: string) {
  return prisma.job.findFirst({ where: { id, userId } });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await getJobOrFail(id, session.user.id);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getJobOrFail(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { company, role, jobUrl, appliedDate, status, notes } = body;

  const newStatus = status as JobStatus | undefined;
  const statusChanged = newStatus !== undefined && newStatus !== existing.status;

  const job = await prisma.$transaction(async (tx) => {
    if (statusChanged) {
      await reconcileHistory(tx, id, existing.status, newStatus!);
    }

    return tx.job.update({
      where: { id },
      data: {
        ...(company !== undefined && { company }),
        ...(role !== undefined && { role }),
        ...(jobUrl !== undefined && { jobUrl }),
        ...(appliedDate !== undefined && { appliedDate: new Date(appliedDate) }),
        ...(newStatus !== undefined && { status: newStatus }),
        ...(notes !== undefined && { notes }),
      },
    });
  });

  return NextResponse.json(job);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getJobOrFail(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

/**
 * Keep the status-history table consistent with a strict pipeline:
 *   APPLIED → SCREENING → INTERVIEW → OFFER  (linear)
 *   plus terminal: REJECTED, GHOSTED (only one of these per job)
 *
 * - Moving forward in the pipeline appends a new transition.
 * - Moving backward deletes any history beyond the new status.
 * - Moving to a terminal status replaces any prior terminal entry
 *   so a job has at most one terminal transition recorded.
 */
async function reconcileHistory(
  tx: Prisma.TransactionClient,
  jobId: string,
  oldStatus: JobStatus,
  newStatus: JobStatus
) {
  // Case 1: target is terminal (REJECTED / GHOSTED)
  if (isTerminal(newStatus)) {
    await tx.jobStatusHistory.deleteMany({
      where: { jobId, toStatus: { in: TERMINAL_STATUSES } },
    });
    // Anchor terminal transition to the highest pipeline status the job has
    // actually reached (so REJECTED→GHOSTED still flows from the real stage).
    const lastPipelineToStatus = await findHighestReachedStatus(tx, jobId, oldStatus);
    await tx.jobStatusHistory.create({
      data: {
        jobId,
        fromStatus: lastPipelineToStatus,
        toStatus: newStatus,
      },
    });
    return;
  }

  // Case 2: target is a pipeline status
  const newRank = pipelineRank(newStatus);
  const oldRank = isTerminal(oldStatus) ? Infinity : pipelineRank(oldStatus);

  if (newRank > oldRank) {
    // Moving forward — also strip any prior terminal transition so the
    // pipeline remains the source of truth.
    await tx.jobStatusHistory.deleteMany({
      where: { jobId, toStatus: { in: TERMINAL_STATUSES } },
    });
    await tx.jobStatusHistory.create({
      data: { jobId, fromStatus: oldStatus, toStatus: newStatus },
    });
  } else {
    // Moving backward (or rewinding from terminal): wipe forward and terminal
    // history beyond the new status. Initial null→APPLIED row is preserved.
    const statusesToWipe: JobStatus[] = [
      ...PIPELINE_STATUSES.slice(newRank + 1),
      ...TERMINAL_STATUSES,
    ];
    await tx.jobStatusHistory.deleteMany({
      where: { jobId, toStatus: { in: statusesToWipe } },
    });
  }
}

/**
 * Returns the toStatus of the most recent non-terminal history entry —
 * i.e., the highest pipeline stage the job actually reached.
 */
async function findHighestReachedStatus(
  tx: Prisma.TransactionClient,
  jobId: string,
  fallback: JobStatus
): Promise<JobStatus> {
  const last = await tx.jobStatusHistory.findFirst({
    where: { jobId, toStatus: { in: PIPELINE_STATUSES } },
    orderBy: { changedAt: "desc" },
  });
  return last?.toStatus ?? (isTerminal(fallback) ? "APPLIED" : fallback);
}
