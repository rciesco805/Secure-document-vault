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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RollbarProvider config={clientConfig}>
      <ErrorBoundary>
        <SessionProvider>
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
        </SessionProvider>
      </ErrorBoundary>
    </RollbarProvider>
  );
}
