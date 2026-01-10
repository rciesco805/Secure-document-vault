import { useEffect, useState } from "react";

import { getSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

import { getPostHogConfig } from "@/lib/posthog";
import { CustomUser } from "@/lib/types";

let posthogInitialized = false;

export const PostHogCustomProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only run on client-side and only once
    if (typeof window === "undefined" || posthogInitialized) {
      setIsReady(true);
      return;
    }

    const posthogConfig = getPostHogConfig();
    
    // If no config, just render children without PostHog
    if (!posthogConfig) {
      setIsReady(true);
      return;
    }

    try {
      posthog.init(posthogConfig.key, {
        api_host: posthogConfig.host,
        ui_host: "https://eu.posthog.com",
        disable_session_recording: true,
        autocapture: false,
        bootstrap: { distinctID: undefined },
        persistence: "memory",
        loaded: (ph) => {
          posthogInitialized = true;
          if (process.env.NODE_ENV === "development") {
            try { ph.debug(); } catch (e) { /* ignore */ }
          }
          getSession()
            .then((session) => {
              if (session) {
                try {
                  ph.identify(
                    (session.user as CustomUser).email ??
                      (session.user as CustomUser).id,
                    {
                      email: (session.user as CustomUser).email,
                      userId: (session.user as CustomUser).id,
                    },
                  );
                } catch (e) { /* ignore analytics errors */ }
              } else {
                try { ph.reset(); } catch (e) { /* ignore */ }
              }
            })
            .catch(() => { /* ignore session errors */ });
        },
      });
    } catch (error) {
      // PostHog init failed (likely blocked by extension) - continue without analytics
      console.warn("Analytics initialization skipped");
    }
    
    setIsReady(true);
  }, []);

  // Always render children immediately - don't block on PostHog
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
};
