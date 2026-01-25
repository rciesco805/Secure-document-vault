import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { authOptions } from "@/lib/auth/auth-options";
import { sendFormDReminderEmail } from "@/lib/emails/send-form-d-reminder";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return handleGetReminders(req, res);
  } else if (req.method === "POST") {
    return handleCheckAndSendReminders(req, res);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

async function handleGetReminders(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = session.user as CustomUser;

  const userTeam = await prisma.userTeam.findFirst({
    where: { userId: user.id },
    include: { team: true },
  });

  if (!userTeam) {
    return res.status(403).json({ error: "No team access" });
  }

  if (!["ADMIN", "OWNER"].includes(userTeam.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const fundsWithReminders = await prisma.fund.findMany({
    where: {
      teamId: userTeam.teamId,
      formDFilingDate: { not: null },
    },
    select: {
      id: true,
      name: true,
      formDFilingDate: true,
      formDAmendmentDue: true,
      formDReminderSent: true,
      stateNoticesRequired: true,
      status: true,
    },
    orderBy: { formDAmendmentDue: "asc" },
  });

  const reminders = fundsWithReminders.map((fund) => {
    const amendmentDue = fund.formDAmendmentDue 
      ? new Date(fund.formDAmendmentDue) 
      : fund.formDFilingDate 
        ? new Date(new Date(fund.formDFilingDate).getTime() + 365 * 24 * 60 * 60 * 1000)
        : null;

    const daysUntilDue = amendmentDue 
      ? Math.ceil((amendmentDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    const urgency = daysUntilDue !== null
      ? daysUntilDue <= 0 ? "OVERDUE"
        : daysUntilDue <= 7 ? "CRITICAL"
        : daysUntilDue <= 30 ? "WARNING"
        : "OK"
      : "UNKNOWN";

    return {
      fundId: fund.id,
      fundName: fund.name,
      formDFilingDate: fund.formDFilingDate,
      amendmentDue,
      daysUntilDue,
      urgency,
      reminderSent: fund.formDReminderSent,
      stateNotices: fund.stateNoticesRequired,
      status: fund.status,
    };
  });

  const upcomingReminders = reminders.filter(
    (r) => r.daysUntilDue !== null && r.daysUntilDue <= 30
  );

  return res.status(200).json({
    reminders,
    upcomingCount: upcomingReminders.length,
    overdueCount: reminders.filter((r) => r.urgency === "OVERDUE").length,
  });
}

async function handleCheckAndSendReminders(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = session.user as CustomUser;

  const userTeam = await prisma.userTeam.findFirst({
    where: { userId: user.id },
  });

  if (!userTeam || !["ADMIN", "OWNER"].includes(userTeam.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { fundId, action } = req.body;

  if (!action || !["send_reminder", "check_all", "update_filing"].includes(action)) {
    return res.status(400).json({ error: "Invalid action. Must be send_reminder, check_all, or update_filing" });
  }

  if (action === "send_reminder" && fundId) {
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: {
        team: {
          include: {
            users: {
              where: { role: { in: ["ADMIN", "OWNER"] } },
              include: { user: true },
            },
          },
        },
      },
    });

    if (!fund) {
      return res.status(404).json({ error: "Fund not found" });
    }

    const amendmentDue = fund.formDAmendmentDue 
      ? new Date(fund.formDAmendmentDue) 
      : fund.formDFilingDate 
        ? new Date(new Date(fund.formDFilingDate).getTime() + 365 * 24 * 60 * 60 * 1000)
        : null;

    const adminEmails = fund.team.users
      .map((ut) => ut.user.email)
      .filter(Boolean) as string[];

    for (const email of adminEmails) {
      await sendFormDReminderEmail({
        email,
        fundName: fund.name,
        amendmentDueDate: amendmentDue,
        filingDate: fund.formDFilingDate,
      });
    }

    await prisma.fund.update({
      where: { id: fundId },
      data: { formDReminderSent: true },
    });

    return res.status(200).json({ 
      success: true, 
      message: `Reminder sent to ${adminEmails.length} admin(s)` 
    });
  }

  if (action === "check_all") {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const fundsNeedingReminder = await prisma.fund.findMany({
      where: {
        formDFilingDate: { not: null },
        formDReminderSent: false,
        OR: [
          { formDAmendmentDue: { lte: thirtyDaysFromNow } },
          {
            formDAmendmentDue: null,
            formDFilingDate: {
              lte: new Date(now.getTime() - 335 * 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
      include: {
        team: {
          include: {
            users: {
              where: { role: { in: ["ADMIN", "OWNER"] } },
              include: { user: true },
            },
          },
        },
      },
    });

    let sentCount = 0;
    for (const fund of fundsNeedingReminder) {
      const amendmentDue = fund.formDAmendmentDue 
        ? new Date(fund.formDAmendmentDue) 
        : new Date(new Date(fund.formDFilingDate!).getTime() + 365 * 24 * 60 * 60 * 1000);

      const adminEmails = fund.team.users
        .map((ut) => ut.user.email)
        .filter(Boolean) as string[];

      for (const email of adminEmails) {
        await sendFormDReminderEmail({
          email,
          fundName: fund.name,
          amendmentDueDate: amendmentDue,
          filingDate: fund.formDFilingDate,
        });
      }

      await prisma.fund.update({
        where: { id: fund.id },
        data: { formDReminderSent: true },
      });

      sentCount++;
    }

    return res.status(200).json({
      success: true,
      fundsChecked: fundsNeedingReminder.length,
      remindersSent: sentCount,
    });
  }

  if (action === "update_filing" && fundId) {
    const { formDFilingDate, formDAmendmentDue } = req.body;

    await prisma.fund.update({
      where: { id: fundId },
      data: {
        formDFilingDate: formDFilingDate ? new Date(formDFilingDate) : undefined,
        formDAmendmentDue: formDAmendmentDue ? new Date(formDAmendmentDue) : undefined,
        formDReminderSent: false,
      },
    });

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: "Invalid action or missing required parameters" });
}

// Note: For automated scheduled checks, call this endpoint via a cron job 
// (e.g., Replit Deployments scheduled task or external scheduler)
// POST /api/admin/form-d-reminders with { action: "check_all" }
