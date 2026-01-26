import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import Head from "next/head";

import { TeamProvider } from "@/context/team-context";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/pages";
import { Provider as RollbarProvider, ErrorBoundary } from "@rollbar/react";

import { EXCLUDED_PATHS } from "@/lib/constants";
import { clientConfig } from "@/lib/rollbar";

import { PostHogCustomProvider } from "@/components/providers/posthog-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallPrompt } from "@/components/pwa-install";

import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}: AppProps<{ session: Session }>) {
  return (
    <RollbarProvider config={clientConfig}>
      <ErrorBoundary>
        <>
          <Head>
            <title>BF Fund Dataroom | Bermuda Franchise Group</title>
            <meta name="theme-color" content="#000000" />
            <meta
              name="description"
              content="Secure investor dataroom for Bermuda Franchise Group - Work Well. Play Well. Be Well."
              key="description"
            />
            <meta
              property="og:title"
              content="BF Fund Dataroom | Bermuda Franchise Group"
              key="og-title"
            />
            <meta
              property="og:description"
              content="Secure investor dataroom for Bermuda Franchise Group - Work Well. Play Well. Be Well."
              key="og-description"
            />
            <meta
              property="og:image"
              content="/_static/bfg-logo-black.png"
              key="og-image"
            />
            <meta
              property="og:url"
              content="https://bfg-fund-dataroom.vercel.app"
              key="og-url"
            />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@bermudafranchise" />
            <meta name="twitter:creator" content="@bermudafranchise" />
            <meta name="twitter:title" content="BF Fund Dataroom" key="tw-title" />
            <meta
              name="twitter:description"
              content="Secure investor dataroom for Bermuda Franchise Group - Work Well. Play Well. Be Well."
              key="tw-description"
            />
            <meta
              name="twitter:image"
              content="/_static/bfg-logo-black.png"
              key="tw-image"
            />
            <link rel="icon" href="/favicon.png" key="favicon" />
          </Head>
          <SessionProvider session={session}>
            <PostHogCustomProvider>
              <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
                <NuqsAdapter>
                  <main className={inter.className}>
                    <Toaster closeButton />
                    <TooltipProvider delayDuration={100}>
                      {EXCLUDED_PATHS.includes(router.pathname) ? (
                        <Component {...pageProps} />
                      ) : (
                        <TeamProvider>
                          <Component {...pageProps} />
                        </TeamProvider>
                      )}
                    </TooltipProvider>
                    <PWAInstallPrompt />
                  </main>
                </NuqsAdapter>
              </ThemeProvider>
            </PostHogCustomProvider>
          </SessionProvider>
        </>
      </ErrorBoundary>
    </RollbarProvider>
  );
}
