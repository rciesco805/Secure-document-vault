import { useRouter } from "next/router";
import { useTeam } from "@/context/team-context";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";

export type SignatureDocumentStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIALLY_SIGNED"
  | "COMPLETED"
  | "DECLINED"
  | "VOIDED"
  | "EXPIRED";

export interface SignatureRecipient {
  id: string;
  name: string;
  email: string;
  role: "SIGNER" | "VIEWER" | "APPROVER";
  signingOrder: number;
  status: "PENDING" | "SENT" | "VIEWED" | "SIGNED" | "DECLINED";
  viewedAt: string | null;
  signedAt: string | null;
  declinedAt: string | null;
  declinedReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  signatureImage: string | null;
  signingUrl: string | null;
}

export type SignatureFieldType =
  | "SIGNATURE"
  | "INITIALS"
  | "DATE_SIGNED"
  | "TEXT"
  | "CHECKBOX"
  | "NAME"
  | "EMAIL"
  | "COMPANY"
  | "TITLE";

export interface SignatureField {
  id: string;
  documentId: string;
  recipientId: string | null;
  type: SignatureFieldType;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  placeholder: string | null;
  value: string | null;
  signedAt: string | null;
}

export interface SignatureDocument {
  id: string;
  title: string;
  description: string | null;
  file: string;
  fileUrl?: string | null;
  numPages: number | null;
  status: SignatureDocumentStatus;
  expirationDate: string | null;
  sentAt: string | null;
  completedAt: string | null;
  declinedAt: string | null;
  voidedAt: string | null;
  emailSubject: string | null;
  emailMessage: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  recipients: SignatureRecipient[];
  fields?: SignatureField[];
  _count?: {
    recipients: number;
    fields: number;
  };
}

export function useSignatureDocuments() {
  const router = useRouter();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const queryParams = router.query;
  const status = queryParams["status"] as string | undefined;
  const page = Number(queryParams["page"]) || 1;
  const limit = Number(queryParams["limit"]) || 10;

  const queryString = new URLSearchParams();
  if (status) queryString.set("status", status);
  queryString.set("page", page.toString());
  queryString.set("limit", limit.toString());

  const { data, error, mutate, isValidating } = useSWR<{
    documents: SignatureDocument[];
    pagination: { total: number; pages: number; page: number; limit: number };
  }>(
    teamId
      ? `/api/teams/${teamId}/signature-documents?${queryString.toString()}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    documents: data?.documents || [],
    pagination: data?.pagination,
    loading: !data && !error,
    error,
    mutate,
    isValidating,
  };
}

export function useSignatureDocument(documentId: string | undefined) {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { data, error, mutate, isValidating } = useSWR<SignatureDocument>(
    teamId && documentId
      ? `/api/teams/${teamId}/signature-documents/${documentId}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    document: data,
    loading: !data && !error,
    error,
    mutate,
    isValidating,
  };
}
