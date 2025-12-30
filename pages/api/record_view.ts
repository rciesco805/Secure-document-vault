import { NextApiRequest, NextApiResponse } from "next";

import { z } from "zod";

import prisma from "@/lib/prisma";
import { publishPageView } from "@/lib/tinybird";
import { Geo } from "@/lib/types";
import { capitalize, log } from "@/lib/utils";
import { LOCALHOST_GEO_DATA, getGeoData } from "@/lib/utils/geo";
import { userAgentFromString } from "@/lib/utils/user-agent";

const bodyValidation = z.object({
  linkId: z.string(),
  documentId: z.string(),
  viewId: z.string().optional(),
  dataroomId: z.string().nullable().optional(),
  versionNumber: z.number().int().optional(),
  duration: z.number().int(),
  pageNumber: z.number().int(),
});

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const geo: Geo =
    process.env.VERCEL === "1" ? getGeoData(req.headers) : LOCALHOST_GEO_DATA;

  const ua = userAgentFromString(req.headers["user-agent"]);

  const result = bodyValidation.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ error: `Invalid body: ${result.error.message}` });
  }

  const {
    linkId,
    documentId,
    viewId,
    dataroomId,
    duration,
    pageNumber,
    versionNumber,
  } = result.data;

  if (!viewId) {
    return res.status(400).json({ error: "viewId is required" });
  }

  try {
    await prisma.pageView.create({
      data: {
        viewId,
        linkId,
        documentId,
        dataroomId: dataroomId || null,
        versionNumber: versionNumber || 1,
        pageNumber,
        duration,
        country: geo?.country || "Unknown",
        city: geo?.city || "Unknown",
        region: geo?.region || "Unknown",
        browser: ua.browser.name || "Unknown",
        os: ua.os.name || "Unknown",
        device: ua.device.type ? capitalize(ua.device.type) : "Desktop",
      },
    });

    if (process.env.TINYBIRD_TOKEN) {
      try {
        const { newId } = await import("@/lib/id-helper");
        const { getDomainWithoutWWW } = await import("@/lib/utils");
        const referer = req.headers.referer;
        
        await publishPageView({
          id: newId("view"),
          linkId,
          documentId,
          viewId,
          dataroomId: dataroomId || null,
          versionNumber: versionNumber || 1,
          time: Date.now(),
          duration,
          pageNumber: pageNumber.toString(),
          country: geo?.country || "Unknown",
          city: geo?.city || "Unknown",
          region: geo?.region || "Unknown",
          latitude: geo?.latitude || "Unknown",
          longitude: geo?.longitude || "Unknown",
          ua: ua.ua || "Unknown",
          browser: ua.browser.name || "Unknown",
          browser_version: ua.browser.version || "Unknown",
          engine: ua.engine.name || "Unknown",
          engine_version: ua.engine.version || "Unknown",
          os: ua.os.name || "Unknown",
          os_version: ua.os.version || "Unknown",
          device: ua.device.type ? capitalize(ua.device.type) : "Desktop",
          device_vendor: ua.device.vendor || "Unknown",
          device_model: ua.device.model || "Unknown",
          cpu_architecture: ua.cpu?.architecture || "Unknown",
          bot: ua.isBot,
          referer: referer ? getDomainWithoutWWW(referer) : "(direct)",
          referer_url: referer || "(direct)",
        });
      } catch (tinybirdError) {
        console.warn("Tinybird tracking failed (optional):", tinybirdError);
      }
    }

    res.status(200).json({ message: "View recorded" });
  } catch (error) {
    log({
      message: `Failed to record page view for ${linkId}. \n\n ${error}`,
      type: "error",
      mention: true,
    });
    res.status(500).json({ message: (error as Error).message });
  }
}
