import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { 
      investorProfile: {
        include: {
          accreditationAcks: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          investments: true,
          bankLinks: { where: { status: "ACTIVE" } },
          documents: { 
            where: { documentType: "SUBSCRIPTION_AGREEMENT" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!user?.investorProfile) {
    return res.status(404).json({ message: "Investor profile not found" });
  }

  if (req.method === "GET") {
    return handleGet(res, user);
  } else if (req.method === "PUT") {
    return handlePut(req, res, user);
  }

  return res.status(405).json({ message: "Method not allowed" });
}

function handleGet(res: NextApiResponse, user: any) {
  const investor = user.investorProfile;
  const accreditationAck = investor.accreditationAcks[0];

  const steps = {
    accountCreated: {
      completed: true,
      completedAt: user.createdAt,
    },
    ndaSigned: {
      completed: investor.ndaSigned,
      completedAt: investor.ndaSignedAt,
      required: true,
    },
    accreditationStarted: {
      completed: !!accreditationAck,
      completedAt: accreditationAck?.startedAt,
    },
    accreditationCompleted: {
      completed: accreditationAck?.completedAt != null,
      completedAt: accreditationAck?.completedAt,
      details: accreditationAck ? {
        method: accreditationAck.method,
        type: accreditationAck.accreditationType,
        confirmAccredited: accreditationAck.confirmAccredited,
        confirmRiskAware: accreditationAck.confirmRiskAware,
        confirmDocReview: accreditationAck.confirmDocReview,
        confirmRepresentations: accreditationAck.confirmRepresentations,
      } : null,
    },
    kycVerified: {
      completed: investor.personaStatus === "APPROVED",
      completedAt: investor.personaVerifiedAt,
      status: investor.personaStatus,
      required: true,
    },
    bankLinked: {
      completed: investor.bankLinks.length > 0,
      count: investor.bankLinks.length,
    },
    subscribed: {
      completed: investor.investments.length > 0,
      count: investor.investments.length,
    },
    documentsSigned: {
      completed: investor.documents.length > 0,
      count: investor.documents.length,
      latestSignedAt: investor.documents[0]?.signedAt,
    },
  };

  const completedSteps = Object.values(steps).filter((s: any) => s.completed).length;
  const totalSteps = Object.keys(steps).length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const currentStep = determineCurrentStep(steps);

  return res.status(200).json({
    steps,
    progress: {
      completed: completedSteps,
      total: totalSteps,
      percentage: progressPercentage,
    },
    currentStep,
    onboardingStatus: investor.onboardingCompletedAt ? "COMPLETE" : "IN_PROGRESS",
    onboardingCompletedAt: investor.onboardingCompletedAt,
  });
}

function determineCurrentStep(steps: any): string {
  if (!steps.ndaSigned.completed) return "NDA";
  if (!steps.accreditationCompleted.completed) return "ACCREDITATION";
  if (!steps.kycVerified.completed) return "KYC";
  if (!steps.bankLinked.completed) return "BANK_LINK";
  if (!steps.subscribed.completed) return "SUBSCRIPTION";
  return "COMPLETE";
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, user: any) {
  const { step, data } = req.body;

  if (!step) {
    return res.status(400).json({ message: "Step is required" });
  }

  const allowedSteps = ["ACCREDITATION_CHECKPOINT", "ONBOARDING_STEP", "COMPLETE_ONBOARDING"];
  if (!allowedSteps.includes(step)) {
    return res.status(400).json({ message: "Invalid step type" });
  }

  const investor = user.investorProfile;

  try {
    switch (step) {
      case "ACCREDITATION_CHECKPOINT":
        if (!data?.completedSteps || !Array.isArray(data.completedSteps)) {
          return res.status(400).json({ message: "completedSteps array required" });
        }
        if (investor.accreditationAcks[0]) {
          await prisma.accreditationAck.update({
            where: { id: investor.accreditationAcks[0].id },
            data: {
              completedSteps: data.completedSteps,
            },
          });
        }
        break;

      case "ONBOARDING_STEP":
        if (typeof data?.step !== "number" || data.step < 0 || data.step > 10) {
          return res.status(400).json({ message: "Valid step number required (0-10)" });
        }
        await prisma.investor.update({
          where: { id: investor.id },
          data: { onboardingStep: data.step },
        });
        break;

      case "COMPLETE_ONBOARDING":
        if (!investor.ndaSigned) {
          return res.status(400).json({ message: "NDA must be signed first" });
        }
        if (investor.accreditationStatus === "PENDING") {
          return res.status(400).json({ message: "Accreditation must be completed first" });
        }
        if (investor.personaStatus !== "APPROVED") {
          return res.status(400).json({ message: "KYC verification must be approved first" });
        }
        await prisma.investor.update({
          where: { id: investor.id },
          data: { onboardingCompletedAt: new Date() },
        });
        break;

      default:
        return res.status(400).json({ message: "Unknown step type" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating wizard progress:", error);
    return res.status(500).json({ message: "Failed to update progress" });
  }
}
