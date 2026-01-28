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

export default function QuestionReply({
  viewerName,
  dataroomName = "Investor Deck",
  originalQuestion = "I have a question about the financial projections on page 5.",
  replyContent = "Thank you for your question! The financial projections are based on...",
  adminName = "BF Fund Team",
}: {
  viewerName?: string | null;
  dataroomName?: string | null;
  originalQuestion: string;
  replyContent: string;
  adminName?: string | null;
}) {
  const greeting = viewerName ? `Hi ${viewerName},` : "Hi,";

  return (
    <Html>
      <Head />
      <Preview>Reply to your question about {dataroomName || "your document"}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <span className="font-bold tracking-tighter">BF Fund Dataroom</span>
            </Text>
            <Text className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Reply to Your Question
            </Text>
            <Text className="text-sm leading-6 text-black">
              {greeting}
            </Text>
            <Text className="text-sm leading-6 text-black">
              {adminName || "The BF Fund team"} has responded to your question
              {dataroomName && (
                <> about <span className="font-semibold">{dataroomName}</span></>
              )}:
            </Text>
            <Section className="my-4 rounded border border-gray-200 bg-gray-100 p-4">
              <Text className="m-0 mb-2 text-xs font-semibold text-gray-500">
                Your Question:
              </Text>
              <Text className="m-0 text-sm italic text-gray-600">
                &quot;{originalQuestion}&quot;
              </Text>
            </Section>
            <Section className="my-4 rounded border border-blue-200 bg-blue-50 p-4">
              <Text className="m-0 mb-2 text-xs font-semibold text-blue-600">
                Reply:
              </Text>
              <Text className="m-0 text-sm text-gray-800">
                {replyContent}
              </Text>
            </Section>
            <Text className="text-sm leading-6 text-black">
              You can reply to this email if you have any follow-up questions.
            </Text>
            <Footer
              footerText={
                <>
                  This is a reply to your inquiry. If you have additional questions,
                  simply reply to this email.
                </>
              }
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
