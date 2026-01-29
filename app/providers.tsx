"use client";

import { Provider as RollbarProvider, ErrorBoundary } from "@rollbar/react";
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { clientConfig } from "@/lib/rollbar";

import { PostHogCustomProvider } from "@/components/providers/posthog-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallPrompt } from "@/components/pwa-install";
import { useOfflineCacheSync } from "@/lib/offline/use-offline-cache-sync";

function OfflineCacheSyncProvider({ children }: { children: React.ReactNode }) {
  useOfflineCacheSync();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RollbarProvider config={clientConfig}>
      <ErrorBoundary>
        <SessionProvider>
          <OfflineCacheSyncProvider>
            <PostHogCustomProvider>
              <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
                <NuqsAdapter>
                  <Toaster closeButton />
                  <TooltipProvider delayDuration={100}>
                    {children}
                  </TooltipProvider>
                  <PWAInstallPrompt />
                </NuqsAdapter>
              </ThemeProvider>
            </PostHogCustomProvider>
          </OfflineCacheSyncProvider>
        </SessionProvider>
      </ErrorBoundary>
    </RollbarProvider>
  );
}
