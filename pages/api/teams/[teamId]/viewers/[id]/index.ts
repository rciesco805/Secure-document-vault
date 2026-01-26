import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getDocumentDurationPerViewer } from "@/lib/tinybird";
import { CustomUser } from "@/lib/types";
import { Prisma } from "@prisma/client";

async function fetchAndCacheDurations(
  groupedViews: Array<{ documentId: string; viewIds: string[] }>,
  teamId: string,
  viewerId: string,
  cacheKey: string
): Promise<Record<string, number>> {
  let durationsMap: Record<string, number> = {};
  const cachedDurations = redis ? await redis.get(cacheKey) : null;

  if (cachedDurations) {
    const parsedDurations = typeof cachedDurations === 'string' ? JSON.parse(cachedDurations) : cachedDurations;
    durationsMap = parsedDurations;
  } else {
    const batchSize = 10; 
    for (let i = 0; i < groupedViews.length; i += batchSize) {
      const batch = groupedViews.slice(i, i + batchSize);

      const batchPromises = batch.map(async (view) => {
        try {
          const durationResult = await getDocumentDurationPerViewer({
            documentId: view.documentId,
            viewIds: view.viewIds.join(","),
          });
          return {
            documentId: view.documentId,
            totalDuration: durationResult.data[0]?.sum_duration || 0,
          };
        } catch (error) {
          console.error(`Error fetching duration for document ${view.documentId}:`, error);
          return {
            documentId: view.documentId,
            totalDuration: 0,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        durationsMap[result.documentId] = result.totalDuration;
      });
    }

    if (redis) {
      await redis.set(cacheKey, JSON.stringify(durationsMap), { ex: 600 });
    }
  }

  return durationsMap;
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/teams/:teamId/viewers/:id
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { teamId, id, page, pageSize, sortBy, sortOrder, withDuration } = req.query as {
      teamId: string;
      id: string;
      page?: string;
      pageSize?: string;
      sortBy?: string;
      sortOrder?: string;
      withDuration?: string;
    };

    // Parse pagination parameters
    const currentPage = parseInt(page || "1", 10);
    const limit = Math.min(parseInt(pageSize || "10", 10), 100); // Cap at 100 for performance
    const offset = (currentPage - 1) * limit;

    // Parse sorting parameters
    const validSortFields = ["lastViewed", "totalDuration", "viewCount"];
    const validSortOrders = ["asc", "desc"];
    const sort = validSortFields.includes(sortBy || "") ? sortBy : "lastViewed";
    const order = validSortOrders.includes(sortOrder || "") ? sortOrder : "desc";

    const userId = (session.user as CustomUser).id;

    try {
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
          users: {
            some: {
              userId,
            },
          },
        },
        select: { id: true, plan: true },
      });

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const viewer = await prisma.viewer.findUnique({
        where: { id, teamId },
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!viewer) {
        return res.status(404).json({ message: "Viewer not found" });
      }

      // Enhanced cache key
      const cacheKey = `viewer-details:${teamId}:${id}:${currentPage}:${limit}:${sort}:${order}:v2`;

      let groupedViews: Array<{
        documentId: string;
        viewCount: number;
        lastViewed: Date;
        documentName: string | null;
        documentType: string | null;
        documentContentType: string | null;
        viewIds: string[];
        totalDuration?: number;
      }>;

      let orderByClause: Prisma.Sql;
      if (sort === "lastViewed") {
        orderByClause = order === "desc"
          ? Prisma.sql`"lastViewed" DESC`
          : Prisma.sql`"lastViewed" ASC`;
      } else if (sort === "viewCount") {
        orderByClause = order === "desc"
          ? Prisma.sql`"viewCount" DESC, "lastViewed" DESC`
          : Prisma.sql`"viewCount" ASC, "lastViewed" DESC`;
      } else {
        orderByClause = Prisma.sql`"lastViewed" DESC`;
      }

      if (sort === "totalDuration") {
        const allDocuments = await prisma.$queryRaw`
          WITH viewer_documents AS (
            SELECT 
              v."documentId",
              COUNT(v.id)::int as "viewCount",
              MAX(v."viewedAt") as "lastViewed",
              d.name as "documentName",
              d.type as "documentType",
              d."contentType" as "documentContentType",
              ARRAY_AGG(v.id ORDER BY v."viewedAt" DESC) as "viewIds"
            FROM "View" v
            INNER JOIN "Document" d ON v."documentId" = d.id
            WHERE v."viewerId" = ${id}
              AND v."documentId" IS NOT NULL
            GROUP BY v."documentId", d.name, d.type, d."contentType"
          )
          SELECT * FROM viewer_documents
          ORDER BY "lastViewed" DESC
        ` as Array<{
          documentId: string;
          viewCount: number;
          lastViewed: Date;
          documentName: string | null;
          documentType: string | null;
          documentContentType: string | null;
          viewIds: string[];
        }>;

        const durationCacheKey = `durations:${teamId}:${id}:all:duration-sort`;
        const durationsMap = await fetchAndCacheDurations(allDocuments, teamId, id, durationCacheKey);

        const documentsWithDurations = allDocuments.map(doc => ({
          ...doc,
          totalDuration: durationsMap[doc.documentId] || 0
        }));

        // Sort by duration efficiently
        documentsWithDurations.sort((a, b) => {
          return order === "asc"
            ? a.totalDuration - b.totalDuration
            : b.totalDuration - a.totalDuration;
        });

        // Apply pagination after sorting
        groupedViews = documentsWithDurations.slice(offset, offset + limit);

      } else {
        // Optimized query leveraging our performance indexes
        groupedViews = await prisma.$queryRaw`
          WITH viewer_documents AS (
            SELECT 
              v."documentId",
              COUNT(v.id)::int as "viewCount",
              MAX(v."viewedAt") as "lastViewed",
              d.name as "documentName",
              d.type as "documentType",
              d."contentType" as "documentContentType",
              ARRAY_AGG(v.id ORDER BY v."viewedAt" DESC) as "viewIds"
            FROM "View" v
            INNER JOIN "Document" d ON v."documentId" = d.id
            WHERE v."viewerId" = ${id}
              AND v."documentId" IS NOT NULL
            GROUP BY v."documentId", d.name, d.type, d."contentType"
          )
          SELECT * FROM viewer_documents
          ORDER BY ${orderByClause}
          LIMIT ${limit}
          OFFSET ${offset}
        ` as Array<{
          documentId: string;
          viewCount: number;
          lastViewed: Date;
          documentName: string | null;
          documentType: string | null;
          documentContentType: string | null;
          viewIds: string[];
        }>;
      }

      const totalCountResult = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT v."documentId")::int as count
        FROM "View" v
        WHERE v."viewerId" = ${id}
          AND v."documentId" IS NOT NULL
      ` as Array<{ count: number }>;

      const totalItems = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(totalItems / limit);

      // If withDuration=true, return only duration data for faster response
      if (withDuration === "true") {
        try {
          const durationCacheKey = `durations:${teamId}:${id}:${currentPage}:${limit}:${sort}:${order}`;
          const durationsMap = await fetchAndCacheDurations(groupedViews, teamId, id, durationCacheKey);

          // Add cache headers
          res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
          return res.status(200).json({ durations: durationsMap });

        } catch (error) {
          console.error("Error processing duration batches:", error);
          // Return empty durations on error
          const emptyDurationsMap = Object.fromEntries(
            groupedViews.map(view => [view.documentId, 0])
          );
          return res.status(200).json({ durations: emptyDurationsMap });
        }
      }

      // Standard response without durations
      const formattedViews = groupedViews.map((view) => ({
        documentId: view.documentId,
        viewCount: view.viewCount,
        lastViewed: view.lastViewed,
        document: {
          id: view.documentId,
          name: view.documentName,
          type: view.documentType,
          contentType: view.documentContentType,
        },
        totalDuration: view.totalDuration || 0,
      }));

      const newViewer = {
        ...viewer,
        views: formattedViews,
        pagination: {
          currentPage,
          pageSize: limit,
          totalItems,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
        sorting: {
          sortBy: sort,
          sortOrder: order,
        },
      };

      if (withDuration !== "true" && redis) {
        await redis.set(cacheKey, JSON.stringify(formattedViews), { ex: 600 }); // 10 min cache
      }
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');

      return res.status(200).json(newViewer);
    } catch (error) {
      console.error('Viewer Details API Error:', error);
      errorhandler(error, res);
    }
  } else if (req.method === "DELETE") {
    // DELETE /api/teams/:teamId/viewers/:id
    // SEC COMPLIANCE: This is a SOFT DELETE - viewer record and all activity logs are preserved
    // Only access is revoked, documentation remains for audit purposes
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { teamId, id } = req.query as {
      teamId: string;
      id: string;
    };
    
    const { reason, forceHardDelete } = req.body || {};

    const userId = (session.user as CustomUser).id;

    try {
      // Verify team membership
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
          users: {
            some: {
              userId,
            },
          },
        },
        select: { id: true },
      });

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Check if viewer exists and get current access status
      const viewer = await prisma.viewer.findUnique({
        where: { id, teamId },
        select: { 
          id: true, 
          email: true, 
          accessRevokedAt: true,
          _count: { select: { views: true } },
        },
      });

      if (!viewer) {
        return res.status(404).json({ message: "Viewer not found" });
      }

      // Check if already revoked
      if (viewer.accessRevokedAt) {
        return res.status(400).json({ 
          message: "Access already revoked",
          revokedAt: viewer.accessRevokedAt,
        });
      }

      // SEC COMPLIANCE: Soft delete - preserve all records, just revoke access
      // This maintains the complete audit trail as required by 506(c) regulations
      const revokedViewer = await prisma.viewer.update({
        where: { id },
        data: {
          accessRevokedAt: new Date(),
          accessRevokedBy: userId,
          accessRevokedReason: reason || "Access revoked by administrator",
        },
        select: {
          id: true,
          email: true,
          accessRevokedAt: true,
          accessRevokedReason: true,
          _count: { select: { views: true } },
        },
      });

      // Also remove from all viewer groups to prevent future access
      await prisma.viewerGroupMembership.deleteMany({
        where: { viewerId: id },
      });

      // Clear any cached data for this viewer
      if (redis) {
        try {
          await redis.del(`viewer-details:${teamId}:${id}`);
        } catch (cacheError) {
          console.error("Error clearing cache:", cacheError);
        }
      }

      console.log(`[SEC AUDIT] Access revoked for viewer ${viewer.email} (${id}) by user ${userId}. Views preserved: ${viewer._count.views}`);

      return res.status(200).json({ 
        message: "Access revoked successfully",
        viewer: {
          id: revokedViewer.id,
          email: revokedViewer.email,
          accessRevokedAt: revokedViewer.accessRevokedAt,
          reason: revokedViewer.accessRevokedReason,
        },
        auditInfo: {
          viewsPreserved: revokedViewer._count.views,
          documentsAccessedHistoryPreserved: true,
          secComplianceNote: "All activity records retained for SEC 506(c) compliance",
        },
      });
    } catch (error) {
      console.error("Error revoking viewer access:", error);
      errorhandler(error, res);
    }
  } else {
    // We only allow GET and DELETE requests
    res.setHeader("Allow", ["GET", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
