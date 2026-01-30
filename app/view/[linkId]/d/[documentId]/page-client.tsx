"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";

import React, { useEffect, useState } from "react";

import NotFound from "@/pages/404";
import { DataroomBrand } from "@prisma/client";
import Cookies from "js-cookie";
import { useSession } from "next-auth/react";
import { ExtendedRecordMap } from "notion-types";
import { parsePageId } from "notion-utils";
import z from "zod";

import notion from "@/lib/notion";
import { addSignedUrls } from "@/lib/notion/utils";
import { CustomUser, LinkWithDataroomDocument, NotionTheme } from "@/lib/types";

import LoadingSpinner from "@/components/ui/loading-spinner";
import CustomMetaTag from "@/components/view/custom-metatag";
import DataroomDocumentView from "@/components/view/dataroom/dataroom-document-view";

type DataroomDocumentLinkData = {
  linkType: "DATAROOM_LINK";
  link: LinkWithDataroomDocument;
  brand: DataroomBrand | null;
};

type DataroomDocumentProps = {
  linkData?: DataroomDocumentLinkData;
  notionData?: {
    rootNotionPageId: string | null;
    recordMap: ExtendedRecordMap | null;
    theme: NotionTheme | null;
  };
  meta?: {
    enableCustomMetatag: boolean;
    metaTitle: string | null;
    metaDescription: string | null;
    metaImage: string | null;
    metaFavicon: string;
    metaUrl: string;
  };
  showPoweredByBanner?: boolean;
  showAccountCreationSlide?: boolean;
  useAdvancedExcelViewer?: boolean;
  useCustomAccessForm?: boolean;
  logoOnAccessForm?: boolean;
};

export default function DataroomDocumentViewPage({
  linkData: initialLinkData,
  notionData: initialNotionData,
  meta: initialMeta,
  showPoweredByBanner = false,
  showAccountCreationSlide = false,
  useAdvancedExcelViewer = false,
  useCustomAccessForm = false,
  logoOnAccessForm = false,
}: DataroomDocumentProps = {}) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const linkId = (params?.linkId as string) ?? "";
  const documentId = (params?.documentId as string) ?? "";
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const rawStatus = sessionResult?.status ?? "loading";
  const [sessionTimeout, setSessionTimeout] = useState<boolean>(false);
  const [storedToken, setStoredToken] = useState<string | undefined>(undefined);
  const [storedEmail, setStoredEmail] = useState<string | undefined>(undefined);
  const [linkData, setLinkData] = useState<DataroomDocumentLinkData | undefined>(initialLinkData);
  const [notionData, setNotionData] = useState(initialNotionData);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(!initialLinkData);

  // Fetch data if not provided as props
  useEffect(() => {
    if (initialLinkData || !linkId || !documentId) return;
    
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/links/${linkId}/documents/${documentId}`);
        if (response.ok) {
          const data = await response.json();
          setLinkData(data.linkData);
          setNotionData(data.notionData);
          setMeta(data.meta);
        }
      } catch (error) {
        console.error("Failed to fetch document data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [linkId, documentId, initialLinkData]);

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
    // Check all possible cookie keys: global pm_vft, linkId-based, and slug-based for compatibility
    const linkSlug = linkData?.link?.slug;
    const cookieToken =
      Cookies.get("pm_vft") || 
      Cookies.get(`pm_drs_flag_${linkId}`) ||
      (linkSlug ? Cookies.get(`pm_drs_flag_${linkSlug}`) : undefined);
    const storedEmail = window.localStorage.getItem("bffund.email");
    if (cookieToken) {
      setStoredToken(cookieToken);
      if (storedEmail) {
        setStoredEmail(storedEmail.toLowerCase());
      }
    }
  }, [linkId, linkData?.link?.slug]);

  const verifiedEmail = searchParams?.get("email") || "";
  const disableEditEmail = searchParams?.get("d") || "";
  const previewToken = searchParams?.get("previewToken") || undefined;
  const preview = searchParams?.get("preview") || undefined;
  const link = linkData?.link;
  const brand = linkData?.brand;

  // Render the document view for DATAROOM_LINK
  if (!linkData || isLoading || status === "loading") {
    return (
      <>
        {meta && (
          <CustomMetaTag
            favicon={meta.metaFavicon}
            enableBranding={meta.enableCustomMetatag ?? false}
            title={
              meta.metaTitle ??
              `${link?.dataroomDocument?.document?.name} | BF Fund Dataroom`
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

  const { email: userEmail, id: userId } = (session?.user as CustomUser) || {};

  // Check if the link is expired
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return (
      <NotFound message="Sorry, the link you're looking for is expired." />
    );
  }

  // Check if the link is archived
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
            meta.metaTitle ??
            `${link?.dataroomDocument?.document?.name} | BF Fund Dataroom`
          }
          description={meta.metaDescription ?? null}
          imageUrl={meta.metaImage ?? null}
          url={meta.metaUrl ?? ""}
        />
      )}
      <DataroomDocumentView
        link={link}
        userEmail={verifiedEmail ?? storedEmail ?? userEmail}
        userId={userId}
        isProtected={!!(emailProtected || linkPassword || enableAgreement)}
        notionData={notionData ?? { rootNotionPageId: null, recordMap: null, theme: null }}
        brand={brand}
        useAdvancedExcelViewer={useAdvancedExcelViewer}
        previewToken={previewToken}
        disableEditEmail={!!disableEditEmail}
        useCustomAccessForm={useCustomAccessForm}
        logoOnAccessForm={logoOnAccessForm}
        token={storedToken}
        verifiedEmail={verifiedEmail}
        preview={!!preview}
      />
    </>
  );
}
