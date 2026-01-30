"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";

import { useEffect, useState } from "react";

import WorkflowAccessView from "@/ee/features/workflows/components/workflow-access-view";
import NotFound from "@/pages/404";
import { Brand, DataroomBrand } from "@prisma/client";
import Cookies from "js-cookie";
import { useSession } from "next-auth/react";
import { ExtendedRecordMap } from "notion-types";
import { parsePageId } from "notion-utils";
import z from "zod";

import { getFeatureFlags } from "@/lib/featureFlags";
import notion from "@/lib/notion";
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
  domain: string;
  slug: string;
  brand: Brand | null;
};

type ViewPageProps = {
  linkData?: DocumentLinkData | DataroomLinkData | WorkflowLinkData | null;
  notionData?: {
    rootNotionPageId: string | null;
    recordMap: ExtendedRecordMap | null;
    theme: NotionTheme | null;
  } | null;
  meta?: {
    enableCustomMetatag: boolean;
    metaTitle: string | null;
    metaFavicon: string | null;
    metaDescription: string | null;
    metaImage: string | null;
    metaUrl: string | null;
  } | null;
  showAccountCreationSlide?: boolean;
  useAdvancedExcelViewer?: boolean;
  useCustomAccessForm?: boolean;
  logoOnAccessForm?: boolean;
  dataroomIndexEnabled?: boolean;
  error?: boolean;
};

export default function ViewPage({
  linkData: initialLinkData = null,
  notionData: initialNotionData = null,
  meta: initialMeta = null,
  showAccountCreationSlide = false,
  useAdvancedExcelViewer = false,
  useCustomAccessForm = false,
  logoOnAccessForm = false,
  dataroomIndexEnabled = false,
  error = false,
}: ViewPageProps = {}) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const domain = (params?.domain as string) ?? "";
  const slug = (params?.slug as string) ?? "";
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const rawStatus = sessionResult?.status ?? "loading";
  const [sessionTimeout, setSessionTimeout] = useState<boolean>(false);
  const [storedToken, setStoredToken] = useState<string | undefined>(undefined);
  const [storedEmail, setStoredEmail] = useState<string | undefined>(undefined);

  // State for client-side data fetching when props not provided
  const [linkData, setLinkData] = useState<DocumentLinkData | DataroomLinkData | WorkflowLinkData | null>(initialLinkData);
  const [notionData, setNotionData] = useState<{
    rootNotionPageId: string | null;
    recordMap: ExtendedRecordMap | null;
    theme: NotionTheme | null;
  } | null>(initialNotionData);
  const [meta, setMeta] = useState<{
    enableCustomMetatag: boolean;
    metaTitle: string | null;
    metaFavicon: string | null;
    metaDescription: string | null;
    metaImage: string | null;
    metaUrl: string | null;
  } | null>(initialMeta);
  const [isLoading, setIsLoading] = useState(!initialLinkData);

  // Fetch data client-side if not provided as props
  useEffect(() => {
    if (initialLinkData) {
      setLinkData(initialLinkData);
      setNotionData(initialNotionData);
      setMeta(initialMeta);
      setIsLoading(false);
      return;
    }
    
    if (!domain || !slug) return;
    
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/links/domains/${domain}/${slug}`);
        if (response.ok) {
          const data = await response.json();
          if (data.linkData) setLinkData(data.linkData);
          if (data.notionData) setNotionData(data.notionData);
          if (data.meta) setMeta(data.meta);
        }
      } catch (err) {
        console.error("Failed to fetch domain view data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [domain, slug, initialLinkData, initialNotionData, initialMeta]);

  // Timeout fallback to prevent infinite loading if session check hangs
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (rawStatus === "loading") {
        setSessionTimeout(true);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [rawStatus]);

  // If session timed out, treat as unauthenticated to prevent infinite loading
  const status = sessionTimeout && rawStatus === "loading" ? "unauthenticated" : rawStatus;

  useEffect(() => {
    // Retrieve token from cookie on component mount
    const cookieToken =
      Cookies.get("pm_vft") || Cookies.get(`pm_drs_flag_${slug}`);
    const storedEmail = window.localStorage.getItem("bffund.email");
    if (cookieToken) {
      setStoredToken(cookieToken);
      if (storedEmail) {
        setStoredEmail(storedEmail.toLowerCase());
      }
    }
  }, [slug]);

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner className="h-20 w-20" />
      </div>
    );
  }

  if (error) {
    return (
      <NotFound message="Sorry, we had trouble loading this link. Please try again in a moment." />
    );
  }

  // Guard against null linkData
  if (!linkData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="h-20 w-20" />
      </div>
    );
  }

  const verifiedEmail = searchParams?.get("email") || "";
  const disableEditEmail = searchParams?.get("d") || "";
  const previewToken = searchParams?.get("previewToken") || undefined;
  const preview = searchParams?.get("preview") || undefined;
  const { linkType } = linkData;

  // Render workflow access view for WORKFLOW_LINK
  if (linkType === "WORKFLOW_LINK") {
    const { entryLinkId, domain, slug, brand } = linkData as WorkflowLinkData;

    return (
      <>
        {meta && (
          <CustomMetaTag
            favicon={meta.metaFavicon}
            enableBranding={false}
            title="Access Workflow | BF Fund Dataroom"
            description={null}
            imageUrl={null}
            url={meta.metaUrl ?? ""}
          />
        )}
        <WorkflowAccessView
          entryLinkId={entryLinkId}
          domain={domain}
          slug={slug}
          brand={brand}
        />
      </>
    );
  }

  // Render the document view for DOCUMENT_LINK
  if (linkType === "DOCUMENT_LINK") {
    const { link, brand } = linkData as DocumentLinkData;

    if (!link || status === "loading") {
      return (
        <>
          {meta && (
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
          )}
          <div className="flex h-screen items-center justify-center">
            <LoadingSpinner className="h-20 w-20" />
          </div>
        </>
      );
    }

    const {
      expiresAt,
      emailProtected,
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
        {meta && (
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
        )}
        <DocumentView
          link={link}
          userEmail={verifiedEmail ?? storedEmail ?? userEmail}
          userId={userId}
          isProtected={!!(emailProtected || linkPassword || enableAgreement)}
          notionData={notionData ?? { rootNotionPageId: null, recordMap: null, theme: null }}
          brand={brand}
          showAccountCreationSlide={showAccountCreationSlide}
          useAdvancedExcelViewer={useAdvancedExcelViewer}
          previewToken={previewToken}
          disableEditEmail={!!disableEditEmail}
          useCustomAccessForm={useCustomAccessForm}
          token={storedToken}
          verifiedEmail={verifiedEmail}
          logoOnAccessForm={logoOnAccessForm}
        />
      </>
    );
  }

  // Render the dataroom view for DATAROOM_LINK
  if (linkType === "DATAROOM_LINK") {
    const { link, brand } = linkData as DataroomLinkData;

    if (!link || status === "loading") {
      return (
        <>
          {meta && (
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
          )}
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
        {meta && (
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
        )}
        <DataroomView
          link={link}
          userEmail={verifiedEmail ?? storedEmail ?? userEmail}
          userId={userId}
          isProtected={!!(emailProtected || linkPassword || enableAgreement)}
          brand={brand as any}
          disableEditEmail={!!disableEditEmail}
          useCustomAccessForm={useCustomAccessForm}
          token={storedToken}
          verifiedEmail={verifiedEmail}
          previewToken={previewToken}
          preview={!!preview}
          logoOnAccessForm={logoOnAccessForm}
          dataroomIndexEnabled={dataroomIndexEnabled}
        />
      </>
    );
  }

  return null;
}
