import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { errorhandler } from "@/lib/errorHandler";
import { CustomUser } from "@/lib/types";
import { generateReportData } from "@/lib/reports/generate-report";

import { authOptions } from "../../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { teamId } = req.query as { teamId: string };
  const userId = (session.user as CustomUser).id;

  const userTeam = await prisma.userTeam.findFirst({
    where: { teamId, userId },
  });

  if (!userTeam) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (req.method === "POST") {
    try {
      const { templateId, reportType, name, config, format = "json" } = req.body;

      if (!reportType) {
        return res.status(400).json({ error: "Report type required" });
      }

      let template = null;
      let reportConfig = config;

      if (templateId) {
        template = await prisma.reportTemplate.findUnique({
          where: { id: templateId, teamId },
        });
        if (template) {
          reportConfig = template.config;
        }
      }

      const report = await prisma.generatedReport.create({
        data: {
          teamId,
          templateId,
          name: name || `${reportType} Report - ${new Date().toLocaleDateString()}`,
          reportType,
          config: reportConfig || {},
          status: "GENERATING",
          createdById: userId,
        },
      });

      try {
        const data = await generateReportData({
          teamId,
          reportType,
          config: reportConfig,
        });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const updatedReport = await prisma.generatedReport.update({
          where: { id: report.id },
          data: {
            data,
            status: "COMPLETED",
            generatedAt: new Date(),
            expiresAt,
          },
        });

        return res.status(200).json(updatedReport);
      } catch (genError) {
        await prisma.generatedReport.update({
          where: { id: report.id },
          data: {
            status: "FAILED",
            error: genError instanceof Error ? genError.message : "Unknown error",
          },
        });
        throw genError;
      }
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
