"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme-provider";

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <main>
          <Toaster closeButton richColors theme="dark" />
          <div>{children}</div>
        </main>
      </ThemeProvider>
    </SessionProvider>
  );
}
