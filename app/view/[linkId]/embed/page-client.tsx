"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";

import { useEffect, useState } from "react";

import NotFound from "@/pages/404";

import { useAnalytics } from "@/lib/analytics";

import LoadingSpinner from "@/components/ui/loading-spinner";
import DataroomView from "@/components/view/dataroom/dataroom-view";
import DocumentView from "@/components/view/document-view";

import { ViewPageProps } from "../page-client";


export default function EmbedPage(props: ViewPageProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const linkId = (params?.linkId as string) ?? "";
  const [isEmbedded, setIsEmbedded] = useState<boolean | null>(null);
  const analytics = useAnalytics();

  useEffect(() => {
    if (!linkId) return;

    // Check if the page is embedded in an iframe
    const isInIframe = window !== window.parent;
    setIsEmbedded(isInIframe);

    if (isInIframe) {
      document.body.classList.add("embed-view");

      // Track embed view with referrer information
      const referrer = document.referrer;
      const embedSource = referrer ? new URL(referrer).hostname : "direct";

      analytics.capture("Embedded Link Loaded", {
        linkId,
        embedSource,
        url: referrer || "unknown",
        userAgent: window.navigator.userAgent,
      });

      return () => document.body.classList.remove("embed-view");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId]);

  // Show loading state while checking
  if (isEmbedded === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="h-20 w-20" />
      </div>
    );
  }

  // Block direct access
  if (!isEmbedded) {
    return (
      <NotFound message="This page can only be accessed when embedded in another website." />
    );
  }

  const verifiedEmail = searchParams?.get("email") || "";
  const disableEditEmail = searchParams?.get("d") || "";
  const previewToken = searchParams?.get("previewToken") || undefined;
  const { linkType, brand } = props.linkData;

  // Render the document view for DOCUMENT_LINK
  if (linkType === "DOCUMENT_LINK") {
    const { link } = props.linkData;
    if (!props.linkData) {
      return (
        <div className="flex h-screen items-center justify-center">
          <LoadingSpinner className="h-20 w-20" />
        </div>
      );
    }

    const {
      expiresAt,
      emailProtected,
      emailAuthenticated,
      password: linkPassword,
      enableAgreement,
      isArchived,
    } = link;

    // If the link is expired, show a 404 page
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return (
        <NotFound message="Sorry, the link you're looking for is expired." />
      );
    }

    if (isArchived) {
      return (
        <NotFound message="Sorry, the link you're looking for is archived." />
      );
    }

    return (
      <div className="h-screen w-full overflow-hidden">
        <DocumentView
          link={link}
          userEmail={verifiedEmail}
          userId={null}
          isProtected={!!(emailProtected || linkPassword || enableAgreement)}
          notionData={props.notionData}
          brand={brand}
          showPoweredByBanner={props.showPoweredByBanner}
          showAccountCreationSlide={props.showAccountCreationSlide}
          useAdvancedExcelViewer={props.useAdvancedExcelViewer}
          previewToken={previewToken}
          disableEditEmail={!!disableEditEmail}
          useCustomAccessForm={props.useCustomAccessForm}
          verifiedEmail={verifiedEmail}
          isEmbedded
        />
      </div>
    );
  }

  // Render the dataroom view for DATAROOM_LINK
  if (linkType === "DATAROOM_LINK") {
    const { link } = props.linkData;
    if (!link) {
      return (
        <div className="flex h-screen items-center justify-center">
          <LoadingSpinner className="h-20 w-20" />
        </div>
      );
    }

    const {
      expiresAt,
      emailProtected,
      emailAuthenticated,
      password: linkPassword,
      enableAgreement,
      isArchived,
    } = link;

    // If the link is expired, show a 404 page
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return (
        <NotFound message="Sorry, the link you're looking for is expired." />
      );
    }

    if (isArchived) {
      return (
        <NotFound message="Sorry, the link you're looking for is archived." />
      );
    }

    return (
      <div className="h-screen w-full overflow-hidden">
        <DataroomView
          link={link}
          userEmail={verifiedEmail}
          userId={null}
          isProtected={!!(emailProtected || linkPassword || enableAgreement)}
          brand={brand as any}
          previewToken={previewToken}
          disableEditEmail={!!disableEditEmail}
          useCustomAccessForm={props.useCustomAccessForm}
          verifiedEmail={verifiedEmail}
          isEmbedded
        />
      </div>
    );
  }
}
