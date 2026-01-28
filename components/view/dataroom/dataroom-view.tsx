import Link from "next/link";
import { useRouter } from "next/router";

import React, { useEffect, useRef, useState } from "react";

import Cookies from "js-cookie";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { useAnalytics } from "@/lib/analytics";
import { SUPPORTED_DOCUMENT_SIMPLE_TYPES } from "@/lib/constants";
import { useDisablePrint } from "@/lib/hooks/use-disable-print";
import { LinkWithDataroom } from "@/lib/types";

import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AccessForm, {
  DEFAULT_ACCESS_FORM_DATA,
  DEFAULT_ACCESS_FORM_TYPE,
} from "@/components/view/access-form";

import EmailVerificationMessage from "../access-form/email-verification-form";
import DataroomViewer, { DataroomBrandWithWelcome } from "../viewer/dataroom-viewer";

export type TSupportedDocumentSimpleType =
  (typeof SUPPORTED_DOCUMENT_SIMPLE_TYPES)[number];

export type TDocumentData = {
  id: string;
  name: string;
  hasPages: boolean;
  documentType: TSupportedDocumentSimpleType;
  documentVersionId: string;
  documentVersionNumber: number;
  downloadOnly: boolean;
  isVertical?: boolean;
};

export type DEFAULT_DATAROOM_VIEW_TYPE = {
  viewId?: string;
  isPreview?: boolean;
  verificationToken?: string;
  viewerEmail?: string;
  viewerId?: string;
  conversationsEnabled?: boolean;
  enableVisitorUpload?: boolean;
  isTeamMember?: boolean;
  isInvestor?: boolean;
  agentsEnabled?: boolean;
  dataroomName?: string;
};

export default function DataroomView({
  link,
  userEmail,
  userId,
  isProtected,
  brand,
  token,
  verifiedEmail,
  previewToken,
  disableEditEmail,
  useCustomAccessForm,
  logoOnAccessForm,
  isEmbedded,
  preview,
  dataroomIndexEnabled,
  magicLinkToken,
}: {
  link: LinkWithDataroom;
  userEmail: string | null | undefined;
  userId: string | null | undefined;
  isProtected: boolean;
  brand?: DataroomBrandWithWelcome | null;
  token?: string;
  verifiedEmail?: string;
  previewToken?: string;
  disableEditEmail?: boolean;
  useCustomAccessForm?: boolean;
  isEmbedded?: boolean;
  preview?: boolean;
  logoOnAccessForm?: boolean;
  dataroomIndexEnabled?: boolean;
  magicLinkToken?: string;
}) {
  useDisablePrint();
  const {
    linkType,
    dataroom,
    emailProtected,
    password: linkPassword,
    enableAgreement,
    group,
  } = link;

  const analytics = useAnalytics();
  const router = useRouter();
  const [folderId, setFolderId] = useState<string | null>(null);

  const didMount = useRef<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewData, setViewData] = useState<DEFAULT_DATAROOM_VIEW_TYPE>({
    viewId: "",
  });
  const [data, setData] = useState<DEFAULT_ACCESS_FORM_TYPE>(
    DEFAULT_ACCESS_FORM_DATA,
  );
  const [verificationRequested, setVerificationRequested] =
    useState<boolean>(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(
    token ?? null,
  );

  const [code, setCode] = useState<string | null>(magicLinkToken ?? null);
  const [isInvalidCode, setIsInvalidCode] = useState<boolean>(false);
  const [magicLinkProcessed, setMagicLinkProcessed] = useState<boolean>(false);
  const [autoVerifyAttempted, setAutoVerifyAttempted] = useState<boolean>(false);
  
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const rawSessionStatus = sessionResult?.status ?? "loading";
  const [sessionTimeout, setSessionTimeout] = useState<boolean>(false);

  // Timeout fallback to prevent infinite loading if session check hangs
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (rawSessionStatus === "loading") {
        setSessionTimeout(true);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [rawSessionStatus]);

  // If session timed out, treat as unauthenticated to prevent infinite loading
  const sessionStatus = sessionTimeout && rawSessionStatus === "loading" ? "unauthenticated" : rawSessionStatus;

  const handleSubmission = async (overrideCode?: string, overrideEmail?: string): Promise<void> => {
    setIsLoading(true);
    const effectiveCode = overrideCode ?? code;
    const effectiveEmail = overrideEmail ?? data.email ?? verifiedEmail ?? userEmail ?? null;
    const response = await fetch("/api/views-dataroom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        email: effectiveEmail,
        linkId: link.id,
        userId: userId ?? null,
        dataroomId: dataroom?.id,
        linkType: "DATAROOM_LINK",
        viewType: "DATAROOM_VIEW",
        previewToken,
        code: effectiveCode ?? undefined,
        token: verificationToken ?? undefined,
        verifiedEmail: verifiedEmail ?? undefined,
      }),
    });

    if (response.ok) {
      const fetchData = await response.json();

      if (fetchData.type === "email-verification") {
        setVerificationRequested(true);
        setIsLoading(false);
      } else {
        const {
          viewId,
          isPreview,
          verificationToken,
          viewerEmail,
          viewerId,
          conversationsEnabled,
          enableVisitorUpload,
          isTeamMember,
          isInvestor,
          agentsEnabled,
          dataroomName,
        } = fetchData as DEFAULT_DATAROOM_VIEW_TYPE;

        analytics.identify(
          userEmail ?? viewerEmail ?? verifiedEmail ?? data.email ?? undefined,
        );
        analytics.capture("Link Viewed", {
          linkId: link.id,
          dataroomId: dataroom?.id,
          linkType: linkType,
          viewerId: viewerId,
          viewerEmail: viewerEmail ?? data.email ?? verifiedEmail ?? userEmail,
          isEmbedded,
          isTeamMember,
          teamId: link.teamId,
        });

        // set the verification token to the cookie for subsequent document views
        if (verificationToken) {
          // Use root path to ensure cookies work across all sub-routes
          Cookies.set("pm_vft", verificationToken, {
            path: "/",
            expires: 1,
            sameSite: "strict",
            secure: true,
          });
          // Always write the link.id cookie for direct link access
          Cookies.set(`pm_drs_flag_${link.id}`, verificationToken, {
            path: "/",
            expires: 1,
            sameSite: "strict",
            secure: true,
          });
          // Also write the slug cookie if link has a slug (for custom domain access)
          if (link.slug) {
            Cookies.set(`pm_drs_flag_${link.slug}`, verificationToken, {
              path: "/",
              expires: 1,
              sameSite: "strict",
              secure: true,
            });
          }
          setCode(null);
        }

        setViewData({
          viewId,
          isPreview,
          viewerEmail,
          viewerId,
          conversationsEnabled,
          enableVisitorUpload,
          isTeamMember,
          isInvestor,
          agentsEnabled,
          dataroomName,
        });
        setSubmitted(true);
        setVerificationRequested(false);
        setIsLoading(false);
      }
    } else {
      const data = await response.json();
      toast.error(data.message);

      if (data.resetVerification) {
        // Remove cookies with root path to match how they were set
        Cookies.remove("pm_vft", { path: "/" });
        Cookies.remove(`pm_drs_flag_${link.id}`, { path: "/" });
        // Also remove the slug cookie if link has a slug
        if (link.slug) {
          Cookies.remove(`pm_drs_flag_${link.slug}`, { path: "/" });
        }
        setVerificationToken(null);
        setCode(null);
        setIsInvalidCode(true);
      }
      setIsLoading(false);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event: React.FormEvent,
  ): Promise<void> => {
    event.preventDefault();
    await handleSubmission();
  };

  // Auto-verify session for already logged-in users
  // This allows users who authenticated via NextAuth magic link to skip the dataroom verification
  useEffect(() => {
    const autoVerifySession = async () => {
      if (
        sessionStatus === "authenticated" &&
        session?.user?.email &&
        emailProtected &&
        !autoVerifyAttempted &&
        !submitted &&
        !isLoading
      ) {
        setAutoVerifyAttempted(true);
        setIsLoading(true);
        
        try {
          const response = await fetch("/api/view/auto-verify-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: session.user.email,
              linkId: link.id,
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.verified) {
              await handleSubmission(undefined, result.email);
              return;
            }
          }
        } catch (error) {
          console.error("Auto-verify session error:", error);
        }
        setIsLoading(false);
      }
    };
    
    if (sessionStatus !== "loading") {
      autoVerifySession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, session?.user?.email, emailProtected, autoVerifyAttempted, submitted, isLoading, link.id]);

  // If token is present, run handle submit which will verify token and get document
  // If link is not submitted and does not have email / password protection, show the access form
  useEffect(() => {
    if (!didMount.current) {
      if ((!submitted && !isProtected) || token || preview || previewToken) {
        handleSubmission();
        didMount.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, isProtected, token, preview, previewToken]);

  // Handle token updates AFTER initial mount (e.g., when parent verifies magic link)
  // This is separate from the didMount check because we need to react to token changes
  const prevTokenRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    // Only trigger if token changed from undefined/null to a valid value
    if (token && !prevTokenRef.current && didMount.current && !submitted && !isLoading) {
      handleSubmission();
    }
    prevTokenRef.current = token;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, submitted, isLoading]);

  // Handle magic link tokens separately to account for Next.js hydration timing
  // router.query may be empty on initial mount, so we need to wait for router.isReady
  // and ensure both token and email are available from the URL
  useEffect(() => {
    if (!router.isReady) return; // Wait for router to be ready with query params
    
    if (magicLinkToken && verifiedEmail && !magicLinkProcessed && !submitted) {
      console.log("[MAGIC_LINK] Processing token with email:", verifiedEmail);
      setCode(magicLinkToken);
      setMagicLinkProcessed(true);
      handleSubmission(magicLinkToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, magicLinkToken, verifiedEmail, magicLinkProcessed, submitted]);

  // Components to render when email is submitted but verification is pending
  if (verificationRequested) {
    return (
      <EmailVerificationMessage
        onSubmitHandler={handleSubmit}
        data={data}
        isLoading={isLoading}
        code={code}
        setCode={setCode}
        isInvalidCode={isInvalidCode}
        setIsInvalidCode={setIsInvalidCode}
        brand={brand}
      />
    );
  }

  // If link is not submitted and does not have email / password protection, show the access form
  // But skip showing access form if we have a valid token (session cookie) - auto-submit will handle it
  if (!submitted && isProtected && !token && !previewToken && !preview) {
    return (
      <AccessForm
        data={data}
        email={userEmail}
        setData={setData}
        onSubmitHandler={handleSubmit}
        requireEmail={emailProtected}
        requirePassword={!!linkPassword}
        requireAgreement={enableAgreement!}
        agreementName={link.agreement?.name}
        agreementContent={link.agreement?.content}
        agreementContentType={link.agreement?.contentType}
        requireName={link.agreement?.requireName}
        isLoading={isLoading}
        disableEditEmail={disableEditEmail}
        useCustomAccessForm={useCustomAccessForm}
        brand={brand}
        customFields={link.customFields}
        logoOnAccessForm={logoOnAccessForm}
        linkWelcomeMessage={link.welcomeMessage}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="h-20 w-20" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div 
        className="min-h-screen relative"
        style={{
          backgroundColor: brand?.accentColor || "rgb(3, 7, 18)",
        }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/lp/onboard"
                className="fixed top-3 right-3 z-50 inline-flex items-center justify-center rounded-md bg-primary px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary/90 hover:scale-105 sm:top-4 sm:right-4"
              >
                Sign Me Up
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-center">
              <p>Become an investor - complete your onboarding to access the fund</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DataroomViewer
          accessControls={link.accessControls || group?.accessControls || []}
          brand={brand!}
          viewId={viewData.viewId}
          isPreview={viewData.isPreview}
          linkId={link.id}
          dataroom={dataroom}
          allowDownload={link.allowDownload!}
          enableIndexFile={link.enableIndexFile}
          folderId={folderId}
          setFolderId={setFolderId}
          viewerId={viewData.viewerId}
          viewData={viewData}
          isEmbedded={isEmbedded}
          dataroomIndexEnabled={dataroomIndexEnabled}
          viewerEmail={
            viewData.viewerEmail ??
            data.email ??
            verifiedEmail ??
            userEmail ??
            undefined
          }
        />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundColor: brand?.accentColor || "rgb(3, 7, 18)",
      }}
    >
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="h-20 w-20" />
      </div>
    </div>
  );
}
