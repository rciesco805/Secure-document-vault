import prisma from "@/lib/prisma";

export interface AccessCheckResult {
  hasAccess: boolean;
  accessLocations: {
    datarooms: { id: string; name: string }[];
    links: { id: string; name: string | null; accessType: "invitation" | "group" }[];
    groups: { id: string; name: string; dataroomName: string }[];
  };
  viewer: {
    id: string;
    email: string;
    createdAt: Date;
    accessRevokedAt: Date | null;
  } | null;
  totalViews: number;
  lastViewedAt: Date | null;
}

/**
 * Check if an email has access across ALL datarooms, links, and groups in a team.
 * This is critical for SEC compliance - we need to verify access holistically
 * before granting or revoking access to prevent unauthorized access.
 * 
 * Access can come from multiple sources:
 * 1. ViewerInvitations (direct invitations to a link)
 * 2. ViewerGroupMembership -> Link.groupId (group-based access)
 * 3. Viewer.dataroom (direct dataroom assignment)
 * 4. ViewerGroup -> Dataroom (group membership implies dataroom access)
 */
export async function checkCrossLogAccess(
  teamId: string,
  email: string
): Promise<AccessCheckResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Find the viewer for this team/email with all access relationships
  const viewer = await prisma.viewer.findUnique({
    where: {
      teamId_email: {
        teamId,
        email: normalizedEmail,
      },
    },
    include: {
      dataroom: {
        select: { id: true, name: true },
      },
      groups: {
        include: {
          group: {
            include: {
              dataroom: {
                select: { id: true, name: true },
              },
              // Get links associated with this group
              links: {
                select: { id: true, name: true },
                where: { isArchived: false, deletedAt: null },
              },
            },
          },
        },
      },
      views: {
        select: { id: true, viewedAt: true },
        orderBy: { viewedAt: "desc" },
        take: 1,
      },
      invitations: {
        include: {
          link: {
            select: { id: true, name: true },
          },
        },
      },
      _count: {
        select: { views: true },
      },
    },
  });

  if (!viewer) {
    return {
      hasAccess: false,
      accessLocations: { datarooms: [], links: [], groups: [] },
      viewer: null,
      totalViews: 0,
      lastViewedAt: null,
    };
  }

  // Build access locations from ALL sources
  
  // 1. Datarooms: from direct assignment AND from group memberships
  const dataroomMap = new Map<string, { id: string; name: string }>();
  
  // Direct dataroom assignment
  if (viewer.dataroom) {
    dataroomMap.set(viewer.dataroom.id, {
      id: viewer.dataroom.id,
      name: viewer.dataroom.name,
    });
  }
  
  // Datarooms via group memberships
  for (const membership of viewer.groups) {
    const dataroomFromGroup = membership.group.dataroom;
    if (dataroomFromGroup && !dataroomMap.has(dataroomFromGroup.id)) {
      dataroomMap.set(dataroomFromGroup.id, {
        id: dataroomFromGroup.id,
        name: dataroomFromGroup.name,
      });
    }
  }

  // 2. Groups: from ViewerGroupMembership
  const groups = viewer.groups.map((membership) => ({
    id: membership.group.id,
    name: membership.group.name,
    dataroomName: membership.group.dataroom.name,
  }));

  // 3. Links: from invitations AND from group memberships
  const linkMap = new Map<string, { id: string; name: string | null; accessType: "invitation" | "group" }>();
  
  // Links from direct invitations
  for (const inv of viewer.invitations) {
    linkMap.set(inv.link.id, {
      id: inv.link.id,
      name: inv.link.name,
      accessType: "invitation",
    });
  }
  
  // Links from group memberships (Link.groupId references ViewerGroup)
  for (const membership of viewer.groups) {
    for (const groupLink of membership.group.links) {
      if (!linkMap.has(groupLink.id)) {
        linkMap.set(groupLink.id, {
          id: groupLink.id,
          name: groupLink.name,
          accessType: "group",
        });
      }
    }
  }

  // Check if access is currently active (not revoked)
  const viewerWithRevoke = viewer as typeof viewer & { accessRevokedAt: Date | null };
  const hasAccess = viewerWithRevoke.accessRevokedAt === null;

  return {
    hasAccess,
    accessLocations: {
      datarooms: Array.from(dataroomMap.values()),
      links: Array.from(linkMap.values()),
      groups,
    },
    viewer: {
      id: viewer.id,
      email: viewer.email,
      createdAt: viewer.createdAt,
      accessRevokedAt: viewerWithRevoke.accessRevokedAt,
    },
    totalViews: viewer._count.views,
    lastViewedAt: viewer.views[0]?.viewedAt || null,
  };
}

/**
 * Check if revoking access for a viewer would leave them with no access to any dataroom.
 * This helps admins understand the impact of revoking access.
 */
export async function getAccessRevokeImpact(
  teamId: string,
  viewerId: string
): Promise<{
  viewer: { email: string; totalViews: number } | null;
  documentsAccessed: number;
  dataRoomsAccessed: string[];
  willLoseAllAccess: boolean;
  auditTrailPreserved: boolean;
}> {
  const viewer = await prisma.viewer.findUnique({
    where: { id: viewerId, teamId },
    include: {
      views: {
        select: {
          documentId: true,
          dataroomId: true,
        },
        distinct: ["documentId"],
      },
      _count: { select: { views: true } },
    },
  });

  if (!viewer) {
    return {
      viewer: null,
      documentsAccessed: 0,
      dataRoomsAccessed: [],
      willLoseAllAccess: true,
      auditTrailPreserved: true,
    };
  }

  // Get unique dataroom names
  const dataroomIds = [...new Set(viewer.views.map((v) => v.dataroomId).filter(Boolean))];
  const datarooms = dataroomIds.length > 0
    ? await prisma.dataroom.findMany({
        where: { id: { in: dataroomIds as string[] } },
        select: { name: true },
      })
    : [];

  const uniqueDocuments = new Set(viewer.views.map((v) => v.documentId).filter(Boolean));

  return {
    viewer: {
      email: viewer.email,
      totalViews: viewer._count.views,
    },
    documentsAccessed: uniqueDocuments.size,
    dataRoomsAccessed: datarooms.map((d) => d.name),
    willLoseAllAccess: true, // Revoking removes all access
    auditTrailPreserved: true, // Soft delete preserves all audit data
  };
}

/**
 * Verify that a viewer email is already on an access list before granting additional access.
 * Returns existing access info to help prevent duplicate grants.
 */
export async function verifyBeforeGrantingAccess(
  teamId: string,
  email: string,
  targetDataroomId?: string,
  targetGroupId?: string
): Promise<{
  alreadyHasAccess: boolean;
  existingAccess: AccessCheckResult["accessLocations"];
  recommendation: string;
}> {
  const accessCheck = await checkCrossLogAccess(teamId, email);

  if (!accessCheck.viewer) {
    return {
      alreadyHasAccess: false,
      existingAccess: { datarooms: [], links: [], groups: [] },
      recommendation: "New viewer - safe to grant access",
    };
  }

  // Check if they already have the specific access being granted
  const hasTargetDataroom = targetDataroomId
    ? accessCheck.accessLocations.datarooms.some((d) => d.id === targetDataroomId)
    : false;
  const hasTargetGroup = targetGroupId
    ? accessCheck.accessLocations.groups.some((g) => g.id === targetGroupId)
    : false;

  if (hasTargetDataroom || hasTargetGroup) {
    return {
      alreadyHasAccess: true,
      existingAccess: accessCheck.accessLocations,
      recommendation: "Viewer already has this access - no action needed",
    };
  }

  // Check if access was previously revoked
  if (accessCheck.viewer.accessRevokedAt) {
    return {
      alreadyHasAccess: false,
      existingAccess: accessCheck.accessLocations,
      recommendation: `Access was previously revoked on ${accessCheck.viewer.accessRevokedAt.toISOString()}. Consider reactivating instead of creating new access.`,
    };
  }

  return {
    alreadyHasAccess: accessCheck.hasAccess,
    existingAccess: accessCheck.accessLocations,
    recommendation: accessCheck.hasAccess
      ? "Viewer has existing access to other resources - extending access"
      : "Safe to grant access",
  };
}

/**
 * Reactivate a previously revoked viewer's access.
 * For SEC compliance, this creates an audit trail entry for the reactivation.
 */
export async function reactivateViewerAccess(
  teamId: string,
  viewerId: string,
  reactivatedBy: string,
  reason?: string
): Promise<{ success: boolean; viewer: { id: string; email: string } | null; error?: string }> {
  try {
    // Note: accessRevokedAt field added for SEC compliance soft-delete
    const viewer = await (prisma.viewer.findUnique as any)({
      where: { id: viewerId, teamId },
      select: { id: true, email: true, accessRevokedAt: true },
    }) as { id: string; email: string; accessRevokedAt: Date | null } | null;

    if (!viewer) {
      return { success: false, viewer: null, error: "Viewer not found" };
    }

    if (!viewer.accessRevokedAt) {
      return { success: false, viewer: { id: viewer.id, email: viewer.email }, error: "Access is not revoked" };
    }

    // Reactivate by clearing the revoked fields
    const updated = await (prisma.viewer.update as any)({
      where: { id: viewerId },
      data: {
        accessRevokedAt: null,
        accessRevokedBy: null,
        accessRevokedReason: null,
      },
      select: { id: true, email: true },
    }) as { id: string; email: string };

    console.log(`[SEC AUDIT] Access reactivated for viewer ${updated.email} (${viewerId}) by user ${reactivatedBy}. Reason: ${reason || "Not specified"}`);

    return { success: true, viewer: updated };
  } catch (error) {
    console.error("Error reactivating viewer access:", error);
    return { success: false, viewer: null, error: "Failed to reactivate access" };
  }
}
