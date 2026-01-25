"use client";

import { useEffect, createContext, useContext } from "react";
import Rollbar from "rollbar";
import { clientConfig } from "@/lib/rollbar";

const RollbarContext = createContext<Rollbar | null>(null);

export function useRollbar(): Rollbar | null {
  return useContext(RollbarContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && clientConfig.accessToken) {
      const rollbar = new Rollbar(clientConfig);
      (window as unknown as { Rollbar: Rollbar }).Rollbar = rollbar;
    }
  }, []);

  return <>{children}</>;
}
