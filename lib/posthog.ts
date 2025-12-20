export function getPostHogConfig(): { key: string; host: string } | null {
  const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const postHogHost = `${baseUrl}/ingest`;

  if (!postHogKey || !baseUrl) {
    return null;
  }

  return {
    key: postHogKey,
    host: postHogHost,
  };
}
