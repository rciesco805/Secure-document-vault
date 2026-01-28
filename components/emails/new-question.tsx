import React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { Footer } from "./shared/footer";

export default function NewQuestion({
  questionId = "123",
  dataroomId,
  dataroomName = "Investor Deck",
  viewerEmail = "investor@example.com",
  viewerName,
  questionContent = "I have a question about the financial projections on page 5.",
  pageNumber,
  documentName,
}: {
  questionId: string;
  dataroomId?: string;
  dataroomName?: string;
  viewerEmail: string;
  viewerName?: string | null;
  questionContent: string;
  pageNumber?: number | null;
  documentName?: string | null;
}) {
  const displayName = viewerName || viewerEmail;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dataroom.bermudafranchisegroup.com';
  const qandaUrl = dataroomId 
    ? `${baseUrl}/datarooms/${dataroomId}/settings/qanda`
    : baseUrl;

  return (
    <Html>
      <Head />
      <Preview>New question from {displayName}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <span className="font-bold tracking-tighter">BF Fund Dataroom</span>
            </Text>
            <Text className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              New Question from Viewer
            </Text>
            <Text className="text-sm leading-6 text-black">
              <span className="font-semibold">{displayName}</span> has asked a
              question{dataroomName && (
                <> about your dataroom <span className="font-semibold">{dataroomName}</span></>
              )}
              {documentName && (
                <> (document: <span className="font-semibold">{documentName}</span>)</>
              )}
              {pageNumber && (
                <> on page <span className="font-semibold">{pageNumber}</span></>
              )}:
            </Text>
            <Section className="my-4 rounded border border-gray-200 bg-gray-50 p-4">
              <Text className="m-0 text-sm italic text-gray-700">
                &quot;{questionContent}&quot;
              </Text>
            </Section>
            <Text className="text-sm leading-6 text-black">
              You can reply to this question directly from your dashboard or by replying to this email.
            </Text>
            <Section className="my-8 text-center">
              <Button
                className="rounded bg-black text-center text-xs font-semibold text-white no-underline"
                href={qandaUrl}
                style={{ padding: "12px 20px" }}
              >
                View and Reply
              </Button>
            </Section>
            <Footer
              footerText={
                <>
                  Reply directly to this email to respond to the viewer.
                  <br />
                  <br />
                  To manage Q&A settings, visit your dataroom settings.
                </>
              }
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
