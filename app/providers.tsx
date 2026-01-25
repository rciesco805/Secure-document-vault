"use client";

import { useEffect, useState, createContext, useContext } from "react";
import Rollbar from "rollbar";
import { clientConfig } from "@/lib/rollbar";

const RollbarContext = createContext<Rollbar | null>(null);

export function useRollbar(): Rollbar | null {
  return useContext(RollbarContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && clientConfig.accessToken) {
      try {
        const rollbar = new Rollbar(clientConfig);
        (window as unknown as { Rollbar: Rollbar }).Rollbar = rollbar;
      } catch (error) {
        console.error("Failed to initialize Rollbar:", error);
      }
    }
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
