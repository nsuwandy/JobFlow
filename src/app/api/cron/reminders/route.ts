import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { subDays } from "date-fns";
import { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Only consider users who have reminders enabled
  const users = await prisma.user.findMany({
    where: { remindersEnabled: true, email: { not: null } },
    select: {
      id: true,
      email: true,
      name: true,
      reminderDays: true,
      remindApplied: true,
      remindScreening: true,
      remindInterview: true,
    },
  });

  let sent = 0;
  const errors: string[] = [];
  const skipped: string[] = [];

  for (const user of users) {
    const wantedStatuses: JobStatus[] = [];
    if (user.remindApplied) wantedStatuses.push("APPLIED");
    if (user.remindScreening) wantedStatuses.push("SCREENING");
    if (user.remindInterview) wantedStatuses.push("INTERVIEW");

    if (wantedStatuses.length === 0) {
      skipped.push(`${user.email}: no statuses selected`);
      continue;
    }

    const cutoff = subDays(new Date(), user.reminderDays);

    const staleJobs = await prisma.job.findMany({
      where: {
        userId: user.id,
        status: { in: wantedStatuses },
        updatedAt: { lt: cutoff },
      },
    });

    if (staleJobs.length === 0) continue;

    const userName = user.name || "there";
    const jobList = staleJobs
      .map(
        (j) =>
          `<li style="margin-bottom:8px"><strong>${j.company}</strong> — ${j.role} <span style="color:#6b7280">(${j.status})</span></li>`
      )
      .join("");

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: user.email!,
        subject: `JobFlow: ${staleJobs.length} application${staleJobs.length > 1 ? "s" : ""} need${staleJobs.length === 1 ? "s" : ""} a follow-up`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h2 style="color:#1d4ed8;margin-bottom:4px">JobFlow Reminder</h2>
            <p style="color:#6b7280;margin-top:0">Hi ${userName},</p>
            <p>The following application${staleJobs.length > 1 ? "s have" : " has"} had no update in over ${user.reminderDays} days. Consider following up!</p>
            <ul style="padding-left:20px">${jobList}</ul>
            <a href="${process.env.NEXTAUTH_URL}/kanban" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px">
              Open JobFlow
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">
              You're receiving this because email reminders are enabled.
              <a href="${process.env.NEXTAUTH_URL}/settings" style="color:#6b7280">Manage preferences</a>.
            </p>
          </div>
        `,
      });
      sent++;
    } catch (err) {
      errors.push(`Failed to send to ${user.email}: ${String(err)}`);
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}
