import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SETTINGS_SELECT = {
  remindersEnabled: true,
  reminderDays: true,
  remindApplied: true,
  remindScreening: true,
  remindInterview: true,
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: SETTINGS_SELECT,
  });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    remindersEnabled,
    reminderDays,
    remindApplied,
    remindScreening,
    remindInterview,
  } = body;

  if (
    reminderDays !== undefined &&
    (typeof reminderDays !== "number" || reminderDays < 1 || reminderDays > 90)
  ) {
    return NextResponse.json(
      { error: "reminderDays must be between 1 and 90" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(remindersEnabled !== undefined && { remindersEnabled }),
      ...(reminderDays !== undefined && { reminderDays }),
      ...(remindApplied !== undefined && { remindApplied }),
      ...(remindScreening !== undefined && { remindScreening }),
      ...(remindInterview !== undefined && { remindInterview }),
    },
    select: SETTINGS_SELECT,
  });

  return NextResponse.json(user);
}
