import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

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
  linkData: DataroomDocumentLinkData;
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
    metaFavicon: string;
    metaUrl: string;
  };
  showPoweredByBanner: boolean;
  showAccountCreationSlide: boolean;
  useAdvancedExcelViewer: boolean;
  useCustomAccessForm: boolean;
  logoOnAccessForm: boolean;
};

export default function DataroomDocumentViewPage({
  linkData,
  notionData,
  meta,
  showPoweredByBanner,
  showAccountCreationSlide,
  useAdvancedExcelViewer,
  useCustomAccessForm,
  logoOnAccessForm,
}: DataroomDocumentProps) {
  const router = useRouter();
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const rawStatus = sessionResult?.status ?? "loading";
  const [sessionTimeout, setSessionTimeout] = useState<boolean>(false);
  const [storedToken, setStoredToken] = useState<string | undefined>(undefined);
  const [storedEmail, setStoredEmail] = useState<string | undefined>(undefined);

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
      Cookies.get(`pm_drs_flag_${router.query.linkId}`) ||
      (linkSlug ? Cookies.get(`pm_drs_flag_${linkSlug}`) : undefined);
    const storedEmail = window.localStorage.getItem("bffund.email");
    if (cookieToken) {
      setStoredToken(cookieToken);
      if (storedEmail) {
        setStoredEmail(storedEmail.toLowerCase());
      }
    }
  }, [router.query.linkId, linkData?.link?.slug]);

  const {
    email: verifiedEmail,
    d: disableEditEmail,
    previewToken,
    preview,
  } = router.query as {
    email: string;
    d: string;
    previewToken?: string;
    preview?: string;
  };
  const { link, brand } = linkData;

  // Render the document view for DATAROOM_LINK
  if (!linkData || status === "loading") {
    return (
      <>
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
      <DataroomDocumentView
        link={link}
        userEmail={verifiedEmail ?? storedEmail ?? userEmail}
        userId={userId}
        isProtected={!!(emailProtected || linkPassword || enableAgreement)}
        notionData={notionData}
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

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { linkId: linkIdParam, documentId: documentIdParam } =
    context.params as {
      linkId: string;
      documentId: string;
    };

  // Set cache headers to prevent aggressive caching
  context.res.setHeader(
    'Cache-Control',
    'private, no-cache, no-store, must-revalidate'
  );

  try {
    // Accept both CUID format and quicklink format (quicklink_xxx)
    const linkId = z.string().min(1).parse(linkIdParam);
    const documentId = z.string().min(1).parse(documentIdParam);
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/links/${linkId}/documents/${documentId}`,
    );
    
    if (!res.ok) {
      console.error(`API error: ${res.status} ${res.statusText}`);
      return { notFound: true };
    }
    
    const { linkType, link, brand } =
      (await res.json()) as DataroomDocumentLinkData;

    if (!link || !linkType) {
      return { notFound: true };
    }

    if (linkType !== "DATAROOM_LINK") {
      return { notFound: true };
    }

    if (!link.dataroomDocument?.document?.versions?.[0]) {
      console.error("Document data not found in link response");
      return { notFound: true };
    }

    let pageId = null;
    let recordMap = null;
    let theme = null;

    const { type, file, ...versionWithoutTypeAndFile } =
      link.dataroomDocument.document.versions[0];

    if (type === "notion") {
      theme = new URL(file).searchParams.get("mode");
      const notionPageId = parsePageId(file, { uuid: false });
      if (!notionPageId) {
        return {
          notFound: true,
        };
      }

      pageId = notionPageId;
      recordMap = await notion.getPage(pageId, { signFileUrls: false });
      await addSignedUrls({ recordMap });
    }

    const { teamId, team, ...linkData } = link;

    const { advancedExcelEnabled, ...linkDocument } =
      linkData.dataroomDocument.document;

    return {
      props: {
        linkData: {
          linkType: "DATAROOM_LINK",
          link: {
            ...linkData,
            teamId: teamId,
            dataroomDocument: {
              ...linkData.dataroomDocument,
              document: {
                ...linkDocument,
                versions: [versionWithoutTypeAndFile],
              },
            },
          },
          brand,
        },
        notionData: {
          rootNotionPageId: null,
          recordMap,
          theme,
        },
        meta: {
          enableCustomMetatag: link.enableCustomMetatag || false,
          metaTitle: link.metaTitle,
          metaDescription: link.metaDescription,
          metaImage: link.metaImage,
          metaFavicon: brand?.favicon || link.metaFavicon || "/favicon.ico",
          metaUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/view/${linkId}`,
        },
        showPoweredByBanner: false,
        showAccountCreationSlide: false,
        useAdvancedExcelViewer: advancedExcelEnabled,
        useCustomAccessForm: true,
        logoOnAccessForm: true,
      },
    };
  } catch (error) {
    console.error("Fetching error:", error);
    return { props: { error: true } };
  }
}
