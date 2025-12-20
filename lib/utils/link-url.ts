export function constructLinkUrl(link: {
  id: string;
  domainId?: string | null;
  domainSlug?: string | null;
  slug?: string | null;
}) {
  if (link.domainId && link.domainSlug && link.slug) {
    return `https://${link.domainSlug}/${link.slug}`;
  }

  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://dataroom.bermudafranchisegroup.com');
  return `${marketingUrl}/view/${link.id}`;
}


