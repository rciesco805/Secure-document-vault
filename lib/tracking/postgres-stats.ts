import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

export async function getTotalAvgPageDurationPg({
  documentId,
  excludedViewIds,
}: {
  documentId: string;
  excludedViewIds: string[];
}) {
  if (!documentId) {
    return { data: [] };
  }
  
  const result = await prisma.pageView.groupBy({
    by: ["pageNumber", "versionNumber"],
    where: {
      documentId,
      viewId: excludedViewIds.length > 0 ? { notIn: excludedViewIds } : undefined,
    },
    _avg: {
      duration: true,
    },
  });

  return {
    data: result.map((row) => ({
      pageNumber: row.pageNumber.toString(),
      versionNumber: row.versionNumber,
      avg_duration: Math.round((row._avg.duration || 0) / 1000),
    })),
  };
}

export async function getTotalDocumentDurationPg({
  documentId,
  excludedViewIds,
}: {
  documentId: string;
  excludedViewIds: string[];
}) {
  if (!documentId) {
    return { data: [{ sum_duration: 0 }] };
  }
  
  const result = await prisma.pageView.aggregate({
    where: {
      documentId,
      viewId: excludedViewIds.length > 0 ? { notIn: excludedViewIds } : undefined,
    },
    _sum: {
      duration: true,
    },
  });

  return {
    data: [
      {
        sum_duration: Math.round((result._sum.duration || 0) / 1000),
      },
    ],
  };
}

export async function getViewDurationStatsPg({
  documentId,
  viewId,
}: {
  documentId: string;
  viewId: string;
}) {
  if (!documentId || !viewId) {
    return { data: [] };
  }
  
  const result = await prisma.pageView.groupBy({
    by: ["pageNumber"],
    where: {
      documentId,
      viewId,
    },
    _sum: {
      duration: true,
    },
  });

  return {
    data: result.map((row) => ({
      pageNumber: row.pageNumber.toString(),
      sum_duration: Math.round((row._sum.duration || 0) / 1000),
    })),
  };
}

export async function getViewCompletionStatsPg({
  documentId,
  excludedViewIds,
}: {
  documentId: string;
  excludedViewIds: string[];
}) {
  if (!documentId) {
    return { data: [] };
  }
  
  let distinctPages: Array<{ viewId: string; versionNumber: number; pages_viewed: bigint }>;
  
  if (excludedViewIds.length > 0) {
    distinctPages = await prisma.$queryRaw<Array<{ viewId: string; versionNumber: number; pages_viewed: bigint }>>`
      SELECT "viewId", "versionNumber", COUNT(DISTINCT "pageNumber") as pages_viewed
      FROM "PageView"
      WHERE "documentId" = ${documentId}
      AND "viewId" NOT IN (${Prisma.join(excludedViewIds)})
      GROUP BY "viewId", "versionNumber"
    `;
  } else {
    distinctPages = await prisma.$queryRaw<Array<{ viewId: string; versionNumber: number; pages_viewed: bigint }>>`
      SELECT "viewId", "versionNumber", COUNT(DISTINCT "pageNumber") as pages_viewed
      FROM "PageView"
      WHERE "documentId" = ${documentId}
      GROUP BY "viewId", "versionNumber"
    `;
  }

  return {
    data: distinctPages.map((row) => ({
      viewId: row.viewId,
      versionNumber: row.versionNumber,
      pages_viewed: Number(row.pages_viewed),
    })),
  };
}

export async function getViewTotalDurationPg({
  viewId,
}: {
  viewId: string;
}) {
  if (!viewId) {
    return 0;
  }
  
  const result = await prisma.pageView.aggregate({
    where: {
      viewId,
    },
    _sum: {
      duration: true,
    },
  });

  return Math.round((result._sum.duration || 0) / 1000);
}

export async function getViewPagesViewedPg({
  viewId,
}: {
  viewId: string;
}) {
  if (!viewId) {
    return 0;
  }
  
  const result = await prisma.pageView.groupBy({
    by: ["pageNumber"],
    where: {
      viewId,
    },
  });

  return result.length;
}

export async function getTotalLinkDurationPg({
  linkId,
}: {
  linkId: string;
}) {
  if (!linkId) {
    return { sum_duration: 0, view_count: 0 };
  }
  
  // Get all views for this link
  const views = await prisma.view.findMany({
    where: {
      linkId,
    },
    select: {
      id: true,
    },
  });

  if (views.length === 0) {
    return { sum_duration: 0, view_count: 0 };
  }

  const viewIds = views.map((v) => v.id);
  
  const result = await prisma.pageView.aggregate({
    where: {
      viewId: { in: viewIds },
    },
    _sum: {
      duration: true,
    },
  });

  return {
    sum_duration: Math.round((result._sum.duration || 0) / 1000),
    view_count: views.length,
  };
}
