"use client";

import { useEffect } from "react";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import {
  setUserIdForCache,
  clearCacheOnLogout,
  isOfflineCacheSupported,
} from "./document-cache";

export function useOfflineCacheSync() {
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status;

  useEffect(() => {
    if (!isOfflineCacheSupported()) return;

    if (status === "authenticated" && session?.user?.id) {
      setUserIdForCache(session.user.id);
    }
  }, [session?.user?.id, status]);
}

export async function signOutWithCacheClear(options?: Parameters<typeof nextAuthSignOut>[0]) {
  if (isOfflineCacheSupported()) {
    try {
      await clearCacheOnLogout();
    } catch (error) {
      console.error("Failed to clear cache on logout:", error);
    }
  }
  
  return nextAuthSignOut(options);
}
