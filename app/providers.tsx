"use client";

import { useEffect, useState, createContext, useContext, useRef } from "react";
import Rollbar from "rollbar";
import { clientConfig } from "@/lib/rollbar";

const RollbarContext = createContext<Rollbar | null>(null);

export function useRollbar(): Rollbar | null {
  return useContext(RollbarContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const rollbarRef = useRef<Rollbar | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && clientConfig.accessToken && !rollbarRef.current) {
      try {
        rollbarRef.current = new Rollbar(clientConfig);
        (window as unknown as { Rollbar: Rollbar }).Rollbar = rollbarRef.current;
      } catch (error) {
        console.error("Failed to initialize Rollbar:", error);
      }
    }
  }, []);

  return (
    <RollbarContext.Provider value={rollbarRef.current}>
      {children}
    </RollbarContext.Provider>
  );
}
