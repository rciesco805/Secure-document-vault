import React from "react";

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

const ABUSE_TYPES: Record<number, string> = {
  1: "Spam or misleading content",
  2: "Phishing or malware",
  3: "Copyright infringement",
  4: "Privacy violation",
  5: "Harassment or abuse",
  6: "Other",
};

export default function AbuseReportEmail({
  documentName = "Example Document",
  dataroomName = "Example Dataroom",
  abuseType = 1,
  reporterEmail = "viewer@example.com",
  documentUrl = "https://dataroom.bermudafranchisegroup.com",
}: {
  documentName: string;
  dataroomName?: string;
  abuseType: number;
  reporterEmail?: string;
  documentUrl: string;
}) {
  const abuseTypeLabel = ABUSE_TYPES[abuseType] || "Unknown";

  return (
    <Html>
      <Head />
      <Preview>Abuse Report: {documentName}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mb-8 mt-4 text-center text-2xl font-normal">
              <span className="font-bold tracking-tighter">BF Fund Dataroom</span>
            </Text>
            <Text className="font-seminbold mb-8 mt-4 text-center text-xl text-red-600">
              Abuse Report Received
            </Text>
            <Text className="text-sm leading-6 text-black">
              A viewer has reported potential abuse for a document in your dataroom.
            </Text>
            
            <Section className="my-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <Text className="m-0 text-sm text-gray-600">
                <strong>Document:</strong> {documentName}
              </Text>
              {dataroomName && (
                <Text className="m-0 text-sm text-gray-600">
                  <strong>Dataroom:</strong> {dataroomName}
                </Text>
              )}
              <Text className="m-0 text-sm text-gray-600">
                <strong>Abuse Type:</strong> {abuseTypeLabel}
              </Text>
              {reporterEmail && (
                <Text className="m-0 text-sm text-gray-600">
                  <strong>Reported by:</strong> {reporterEmail}
                </Text>
              )}
            </Section>

            <Text className="text-sm leading-6 text-black">
              Please review this report and take appropriate action if necessary.
            </Text>

            <Text className="text-sm text-black">
              Document URL: <br />
              <a href={documentUrl} className="text-blue-600 underline">{documentUrl}</a>
            </Text>

            <Hr className="my-6" />
            <Section className="text-gray-400">
              <Text className="text-xs">
                © {new Date().getFullYear()} Bermuda Franchise Group, LLC. All rights
                reserved.
              </Text>
              <Text className="text-xs">
                This is an automated notification from BF Fund Dataroom.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
