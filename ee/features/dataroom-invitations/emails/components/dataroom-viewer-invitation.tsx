import React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export default function DataroomViewerInvitation({
  dataroomName = "BF Fund Investor Documents",
  senderEmail = "investors@bermudafranchisegroup.com",
  url = "https://docs.bermudafranchisegroup.com/view/123",
  recipientEmail = "recipient@example.com",
  customMessage,
}: {
  dataroomName: string;
  senderEmail: string;
  url: string;
  recipientEmail: string;
  customMessage?: string | null;
}) {
  return (
    <Html>
      <Head />
      <Preview>Your access to {dataroomName} from Bermuda Franchise Group</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <span className="font-bold tracking-tighter">Bermuda Franchise Group</span>
            </Text>
            <Text className="font-seminbold mx-0 mb-4 mt-4 p-0 text-center text-xl">
              Your Access Link
            </Text>
            <Text className="text-sm leading-6 text-black">
              Thank you for your interest in Bermuda Franchise Group.
            </Text>
            <Text className="text-sm leading-6 text-black">
              You have been granted access to view{" "}
              <span className="font-semibold">{dataroomName}</span>.
            </Text>
            {customMessage ? (
              <Text
                className="text-sm leading-6 text-black"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {customMessage}
              </Text>
            ) : null}
            <Section className="mb-[32px] mt-[32px] text-center">
              <Button
                className="rounded bg-black text-center text-xs font-semibold text-white no-underline"
                href={`${url}`}
                style={{ padding: "12px 20px" }}
              >
                View Documents
              </Button>
            </Section>
            <Text className="text-sm text-black">
              or copy and paste this URL into your browser: <br />
              {`${url}`}
            </Text>
            <Hr className="my-6" />
            <Section className="rounded-md bg-gray-100 p-4">
              <Text className="m-0 text-xs font-semibold text-gray-700">
                CONFIDENTIAL NOTICE
              </Text>
              <Text className="m-0 mt-2 text-xs text-gray-600">
                This information is confidential and intended solely for the recipient. 
                Please do not share, forward, or distribute these documents to others 
                without prior written approval from Bermuda Franchise Group.
              </Text>
            </Section>
            <Hr className="my-6" />
            <Section className="text-center text-gray-400">
              <Text className="m-0 text-xs italic">
                Work Well. Play Well. Be Well.
              </Text>
              <Text className="mt-4 text-xs">
                © {new Date().getFullYear()} Bermuda Franchise Group. All rights reserved.
              </Text>
              <Text className="text-xs">
                This email was sent to{" "}
                <span className="text-black">{recipientEmail}</span>.
              </Text>
              <Text className="text-xs">
                Questions? Contact us at{" "}
                <a href="mailto:investors@bermudafranchisegroup.com" className="text-blue-600">
                  investors@bermudafranchisegroup.com
                </a>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
