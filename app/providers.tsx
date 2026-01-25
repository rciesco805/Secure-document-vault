"use client";

import { Provider as RollbarProvider } from "@rollbar/react";
import { clientConfig } from "@/lib/rollbar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RollbarProvider config={clientConfig}>
      {children}
    </RollbarProvider>
  );
}
