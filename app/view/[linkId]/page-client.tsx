"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";

import { useEffect, useState } from "react";

import WorkflowAccessView from "@/ee/features/workflows/components/workflow-access-view";
import NotFound from "@/pages/404";
import { Brand, DataroomBrand, DataroomDocument } from "@prisma/client";
import Cookies from "js-cookie";
import { useSession } from "next-auth/react";
import { ExtendedRecordMap } from "notion-types";
import { parsePageId } from "notion-utils";
import z from "zod";

import { getFeatureFlags } from "@/lib/featureFlags";
import notion from "@/lib/notion";
import { addSignedUrls } from "@/lib/notion/utils";
import {
  CustomUser,
  LinkWithDataroom,
  LinkWithDocument,
  NotionTheme,
} from "@/lib/types";

import LoadingSpinner from "@/components/ui/loading-spinner";
import CustomMetaTag from "@/components/view/custom-metatag";
import DataroomView from "@/components/view/dataroom/dataroom-view";
import DocumentView from "@/components/view/document-view";

type DocumentLinkData = {
  linkType: "DOCUMENT_LINK";
  link: LinkWithDocument;
  brand: Brand | null;
};

type DataroomLinkData = {
  linkType: "DATAROOM_LINK";
  link: LinkWithDataroom;
  brand: DataroomBrand | null;
};

type WorkflowLinkData = {
  linkType: "WORKFLOW_LINK";
  entryLinkId: string;
  brand: Brand | null;
};

export interface ViewPageProps {
  linkData: DocumentLinkData | DataroomLinkData | WorkflowLinkData;
  notionData: {
    rootNotionPageId: string | null;
    recordMap: ExtendedRecordMap | null;
    theme: NotionTheme | null;
  };
  meta: {
    enableCustomMetatag: boolean;
    metaTitle: string | null;
    metaDescription: string | null;
    metaImage: string | null;
    metaUrl: string | null;
    metaFavicon: string | null;
  };
  showPoweredByBanner: boolean;
  showAccountCreationSlide: boolean;
  useAdvancedExcelViewer: boolean;
  useCustomAccessForm: boolean;
  logoOnAccessForm: boolean;
  dataroomIndexEnabled?: boolean;
  annotationsEnabled?: boolean;
}


export default function ViewPage({
  linkData,
  notionData,
  meta,
  showPoweredByBanner,
  showAccountCreationSlide,
  useAdvancedExcelViewer,
  useCustomAccessForm,
  logoOnAccessForm,
  dataroomIndexEnabled,
  annotationsEnabled,
  error,
  notionError,
}: ViewPageProps & { error?: boolean; notionError?: boolean }) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const linkId = (params?.linkId as string) ?? "";
  const queryToken = searchParams?.get("token") || undefined;
  const queryEmail = searchParams?.get("email") || undefined;
  const queryPreviewToken = searchParams?.get("previewToken") || undefined;
  const queryD = searchParams?.get("d") || undefined;
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const rawStatus = sessionResult?.status ?? "loading";
  const [storedToken, setStoredToken] = useState<string | undefined>(undefined);
  const [storedEmail, setStoredEmail] = useState<string | undefined>(undefined);
  const [magicLinkVerified, setMagicLinkVerified] = useState<boolean>(false);
  const [isVerifyingMagicLink, setIsVerifyingMagicLink] = useState<boolean>(false);
  const [autoVerifyAttempted, setAutoVerifyAttempted] = useState<boolean>(false);
  const [sessionTimeout, setSessionTimeout] = useState<boolean>(false);

  // Timeout fallback to prevent infinite loading if session check hangs
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (rawStatus === "loading") {
        console.warn("[VIEW] Session loading timeout - forcing render");
        setSessionTimeout(true);
      }
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timeout);
  }, [rawStatus]);

  // If session timed out, treat as unauthenticated to prevent infinite loading
  const status = sessionTimeout && rawStatus === "loading" ? "unauthenticated" : rawStatus;

  useEffect(() => {
    // Retrieve token from cookie on component mount
    const cookieToken =
      Cookies.get("pm_vft") ||
      Cookies.get(`pm_drs_flag_${linkId}`);
    const localStoredEmail = window.localStorage.getItem("bffund.email");
    if (cookieToken) {
      setStoredToken(cookieToken);
      if (localStoredEmail) {
        setStoredEmail(localStoredEmail.toLowerCase());
      }
    }
    
    if (queryToken && queryEmail && linkId) {
      window.localStorage.setItem(`pm_magic_token_${linkId}`, queryToken);
      window.localStorage.setItem(`pm_magic_email_${linkId}`, queryEmail.toLowerCase().trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId, queryToken, queryEmail]);

  // Auto-verify authenticated users from viewer portal
  useEffect(() => {
    const autoVerifyAuthenticatedUser = async () => {
      const userEmail = (session?.user as CustomUser)?.email;
      
      if (
        status !== "authenticated" ||
        !userEmail ||
        !linkId ||
        storedToken ||
        magicLinkVerified ||
        isVerifyingMagicLink ||
        autoVerifyAttempted
      ) {
        return;
      }
      
      setIsVerifyingMagicLink(true);
      
      try {
        const response = await fetch("/api/view/auto-verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, linkId }),
        });
        
        const data = await response.json();
        
        if (data.verified) {
          window.localStorage.setItem("bffund.email", userEmail.toLowerCase());
          setStoredEmail(userEmail.toLowerCase());
          setMagicLinkVerified(true);
          
          const oneHour = 1 / 24;
          Cookies.set(`pm_drs_flag_${linkId}`, "verified", {
            path: `/view/${linkId}`,
            expires: oneHour,
            sameSite: "strict",
            secure: window.location.protocol === "https:",
          });
          setStoredToken("verified");
        }
      } catch (error) {
        console.error("Auto-verification failed:", error);
      } finally {
        setIsVerifyingMagicLink(false);
        setAutoVerifyAttempted(true);
      }
    };
    
    if (true && status === "authenticated") {
      autoVerifyAuthenticatedUser();
    }
  }, [true, linkId, status, session, storedToken, magicLinkVerified, isVerifyingMagicLink, autoVerifyAttempted]);

  // Handle magic link verification via backend
  useEffect(() => {
    const verifyMagicLink = async () => {
      const linkId = linkId as string;
      const token = queryToken as string | undefined;
      const email = queryEmail as string | undefined;

      if (!token || !email || !linkId) {
        return;
      }

      if (magicLinkVerified || isVerifyingMagicLink) {
        return;
      }

      setIsVerifyingMagicLink(true);
      console.log("[MAGIC_LINK] Verifying magic link for:", email);

      try {
        const response = await fetch("/api/view/verify-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email, linkId }),
        });

        const data = await response.json();

        if (data.verified) {
          console.log("[MAGIC_LINK] Verification successful for:", data.email);
          window.localStorage.setItem("bffund.email", data.email.toLowerCase());
          setStoredEmail(data.email.toLowerCase());
          setMagicLinkVerified(true);
          setStoredToken("verified");
          
          const oneHour = 1 / 24;
          Cookies.set(`pm_drs_flag_${linkId}`, "verified", {
            path: `/view/${linkId}`,
            expires: oneHour,
            sameSite: "strict",
            secure: window.location.protocol === "https:",
          });

          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("token");
          cleanUrl.searchParams.delete("email");
          window.history.replaceState({}, "", cleanUrl.toString());
        } else {
          console.error("[MAGIC_LINK] Verification failed:", data.message);
        }
      } catch (error) {
        console.error("[MAGIC_LINK] Verification error:", error);
      } finally {
        setIsVerifyingMagicLink(false);
      }
    };

    if (true) {
      verifyMagicLink();
    }
  }, [true, linkId, queryToken, queryEmail, magicLinkVerified, isVerifyingMagicLink]);


  if (error) {
    return (
      <NotFound message="Sorry, we had trouble loading this link. Please try refreshing." />
    );
  }

  if (notionError) {
    return (
      <NotFound message="Sorry, we had trouble loading this link. Please try again in a moment." />
    );
  }

  const verifiedEmail = queryEmail || "";
  const disableEditEmail = queryD || "";
  const previewToken = queryPreviewToken;
  const preview = searchParams?.get("preview") || undefined;
  const magicLinkToken = queryToken;
  const { linkType } = linkData;

  // Render workflow access view for WORKFLOW_LINK
  if (linkType === "WORKFLOW_LINK") {
    const { entryLinkId, brand } = linkData as WorkflowLinkData;

    return (
      <>
        <CustomMetaTag
          favicon={meta.metaFavicon}
          enableBranding={false}
          title="Access Workflow | BF Fund Dataroom"
          description={null}
          imageUrl={null}
          url={meta.metaUrl ?? ""}
        />
        <WorkflowAccessView entryLinkId={entryLinkId} brand={brand} />
      </>
    );
  }

  // Render the document view for DOCUMENT_LINK
  if (linkType === "DOCUMENT_LINK") {
    const { link, brand } = linkData as DocumentLinkData;

    // Use sessionTimeout to prevent infinite loading
    const isDocSessionLoading = status === "loading" && !sessionTimeout;
    if (!linkData || isDocSessionLoading) {
      return (
        <>
          <CustomMetaTag
            favicon={meta.metaFavicon}
            enableBranding={meta.enableCustomMetatag ?? false}
            title={
              meta.metaTitle ?? `${link?.document?.name} | BF Fund Dataroom`
            }
            description={meta.metaDescription ?? null}
            imageUrl={meta.metaImage ?? null}
            url={meta.metaUrl ?? ""}
          />
          <div className="flex h-screen items-center justify-center">
            <LoadingSpinner className="h-20 w-20" />
          </div>
        </>
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

    const { email: userEmail, id: userId } =
      (session?.user as CustomUser) || {};

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
      <>
        <CustomMetaTag
          favicon={meta.metaFavicon}
          enableBranding={meta.enableCustomMetatag ?? false}
          title={
            meta.metaTitle ?? `${link?.document?.name} | BF Fund Dataroom`
          }
          description={meta.metaDescription ?? null}
          imageUrl={meta.metaImage ?? null}
          url={meta.metaUrl ?? ""}
        />
        <DocumentView
          link={link}
          userEmail={verifiedEmail ?? storedEmail ?? userEmail}
          userId={userId}
          isProtected={!!(emailProtected || linkPassword || enableAgreement)}
          notionData={notionData}
          brand={brand}
          showPoweredByBanner={showPoweredByBanner}
          showAccountCreationSlide={showAccountCreationSlide}
          useAdvancedExcelViewer={useAdvancedExcelViewer}
          previewToken={previewToken}
          disableEditEmail={!!disableEditEmail}
          useCustomAccessForm={useCustomAccessForm}
          logoOnAccessForm={logoOnAccessForm}
          token={storedToken}
          verifiedEmail={verifiedEmail}
          annotationsEnabled={annotationsEnabled}
          magicLinkToken={magicLinkToken}
        />
      </>
    );
  }

  // Render the dataroom view for DATAROOM_LINK
  if (linkType === "DATAROOM_LINK") {
    const { link, brand } = linkData as DataroomLinkData;

    // Wait for session to load and auto-verification to complete before rendering dataroom
    // Also wait if session is authenticated but auto-verify hasn't been attempted yet
    // Use sessionTimeout to prevent infinite loading if session check hangs
    const needsAutoVerify = status === "authenticated" && !storedToken && !magicLinkVerified && !autoVerifyAttempted;
    const isAutoVerifying = status === "authenticated" && !storedToken && !magicLinkVerified && isVerifyingMagicLink;
    const isSessionLoading = status === "loading" && !sessionTimeout;
    const shouldShowLoading = !link || isSessionLoading || needsAutoVerify || isAutoVerifying;
    
    if (shouldShowLoading) {
      return (
        <>
          <CustomMetaTag
            favicon={meta.metaFavicon}
            enableBranding={meta.enableCustomMetatag ?? false}
            title={
              meta.metaTitle ?? `${link?.dataroom?.name} | BF Fund Dataroom`
            }
            description={meta.metaDescription ?? null}
            imageUrl={meta.metaImage ?? null}
            url={meta.metaUrl ?? ""}
          />
          <div className="flex h-screen items-center justify-center bg-black">
            <LoadingSpinner className="h-20 w-20" />
          </div>
        </>
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

    const { email: userEmail, id: userId } =
      (session?.user as CustomUser) || {};

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
      <>
        <CustomMetaTag
          favicon={meta.metaFavicon}
          enableBranding={meta.enableCustomMetatag ?? false}
          title={
            meta.metaTitle ?? `${link?.dataroom?.name} | BF Fund Dataroom`
          }
          description={meta.metaDescription ?? null}
          imageUrl={meta.metaImage ?? null}
          url={meta.metaUrl ?? ""}
        />
        <DataroomView
          link={link}
          userEmail={verifiedEmail ?? storedEmail ?? userEmail}
          verifiedEmail={verifiedEmail}
          userId={userId}
          isProtected={!!(emailProtected || linkPassword || enableAgreement)}
          brand={brand as any}
          disableEditEmail={!!disableEditEmail}
          useCustomAccessForm={useCustomAccessForm}
          logoOnAccessForm={logoOnAccessForm}
          token={storedToken}
          previewToken={previewToken}
          preview={!!preview}
          dataroomIndexEnabled={dataroomIndexEnabled}
          magicLinkToken={magicLinkToken}
        />
      </>
    );
  }
}
