import { logger, schedules } from "@trigger.dev/sdk/v3";

import { jobStore } from "@/lib/redis-job-store";

export const cleanupExpiredExports = schedules.task({
  id: "cleanup-expired-exports",
  // Run daily at 2 AM UTC
  cron: "0 2 * * *",
  run: async (payload) => {
    logger.info("Cleanup task skipped - Vercel Blob not configured", {
      timestamp: payload.timestamp,
    });

    // Vercel Blob has been removed - cleanup not needed
    // Just clean up the Redis queue entries without actual blob deletion
    try {
      const blobsToCleanup = await jobStore.getBlobsForCleanup();

      if (blobsToCleanup.length === 0) {
        logger.info("No cleanup entries found");
        return { deletedCount: 0 };
      }

      // Remove entries from cleanup queue (blobs don't exist anyway)
      for (const blob of blobsToCleanup) {
        await jobStore.removeBlobFromCleanupQueue(blob.blobUrl, blob.jobId);
      }

      logger.info("Cleanup queue cleared", {
        entriesRemoved: blobsToCleanup.length,
      });

      return {
        deletedCount: 0,
        entriesCleared: blobsToCleanup.length,
      };
    } catch (error) {
      logger.error("Cleanup task failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});
