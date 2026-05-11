import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as JobStatus | null;

  const jobs = await prisma.job.findMany({
    where: {
      userId: session.user.id,
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { company, role, jobUrl, appliedDate, status, notes } = body;

  if (!company || !role || !appliedDate) {
    return NextResponse.json(
      { error: "company, role, and appliedDate are required" },
      { status: 400 }
    );
  }

  const finalStatus = (status as JobStatus) || "APPLIED";

  const job = await prisma.job.create({
    data: {
      userId: session.user.id,
      company,
      role,
      jobUrl: jobUrl || null,
      appliedDate: new Date(appliedDate),
      status: finalStatus,
      notes: notes || null,
      history: {
        create: { fromStatus: null, toStatus: finalStatus },
      },
    },
  });

  return NextResponse.json(job, { status: 201 });
}
