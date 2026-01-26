"use client";

import { Provider as RollbarProvider } from "@rollbar/react";
import { SessionProvider } from "next-auth/react";
import { clientConfig } from "@/lib/rollbar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RollbarProvider config={clientConfig}>
      <SessionProvider>
        {children}
      </SessionProvider>
    </RollbarProvider>
  );
}
