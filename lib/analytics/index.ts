import { emptyAnalytics, jitsuAnalytics } from "@jitsu/js";
import { posthog } from "posthog-js";

import { getPostHogConfig } from "@/lib/posthog";
import { AnalyticsEvents } from "@/lib/types";

export function useAnalytics() {
  const isPostHogEnabled = getPostHogConfig();

  /**
   * Capture an analytic event.
   * Wrapped in try/catch to prevent blocking if analytics is blocked by browser extensions.
   *
   * @param event The event name.
   * @param properties Properties to attach to the event.
   */
  const capture = (event: string, properties?: Record<string, unknown>) => {
    if (!isPostHogEnabled) {
      return;
    }

    try {
      posthog.capture(event, properties);
    } catch (e) {
      // Analytics blocked by extension - ignore silently
    }
  };

  const identify = (
    distinctId?: string,
    properties?: Record<string, unknown>,
  ) => {
    if (!isPostHogEnabled) {
      return;
    }

    try {
      posthog.identify(distinctId, properties);
    } catch (e) {
      // Analytics blocked by extension - ignore silently
    }
  };

  return {
    capture,
    identify,
  };
}

// For server-side tracking
const analytics =
  process.env.JITSU_HOST && process.env.JITSU_WRITE_KEY
    ? jitsuAnalytics({
        host: process.env.JITSU_HOST,
        writeKey: process.env.JITSU_WRITE_KEY,
      })
    : emptyAnalytics;

export const identifyUser = (userId: string) => analytics.identify(userId);
export const trackAnalytics = (args: AnalyticsEvents) => analytics.track(args);
