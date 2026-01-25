"use client";

import { useEffect } from "react";
import Rollbar from "rollbar";
import { clientConfig } from "@/lib/rollbar";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const rollbar = new Rollbar(clientConfig);
    rollbar.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
        }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#111827",
              marginBottom: "1rem",
            }}>
              Something went wrong
            </h2>
            <p style={{
              color: "#6b7280",
              marginBottom: "1.5rem",
            }}>
              We apologize for the inconvenience. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
