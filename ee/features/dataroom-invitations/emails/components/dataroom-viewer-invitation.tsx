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
  url = "https://bfg-dataroom.replit.app/view/123",
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
      <Preview>Bermuda Franchise Group - Fund I Investor Data Room Access</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <span className="font-bold tracking-tighter">Bermuda Franchise Group</span>
            </Text>
            <Text className="text-sm leading-6 text-black">
              Hi,
            </Text>
            <Text className="text-sm leading-6 text-black">
              You've been granted secure access to the Bermuda Franchise Group – Fund I Investor Data Room.
            </Text>
            <Text className="text-sm leading-6 text-black">
              Inside, you'll find our fund overview, structure, financial models, and supporting diligence materials outlining the Bermuda Club franchise expansion strategy. We appreciate your feedback at this time.
            </Text>
            <Text className="text-sm leading-6 text-black">
              Please review at your convenience. I'm happy to walk through the materials or answer any questions as you dig in.
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
                View the Data Room
              </Button>
            </Section>
            <Text className="text-sm text-gray-500">
              or copy and paste this URL into your browser: <br />
              {`${url}`}
            </Text>
            <Hr className="my-6" />
            <Text className="text-sm leading-6 text-black">
              Best regards,
            </Text>
            <Text className="m-0 text-sm leading-5 text-black">
              <strong>Richard Ciesco</strong><br />
              Managing Partner<br />
              Bermuda Franchise Group
            </Text>
            <Hr className="my-6" />
            <Section className="text-center text-gray-400">
              <Text className="m-0 text-xs italic">
                Work Well. Play Well. Be Well.
              </Text>
              <Text className="mt-4 text-xs">
                © 2026 Bermuda Franchise Group, LLC. All Rights Reserved.
              </Text>
              <Text className="text-xs">
                The invitation was sent by{" "}
                <a href="mailto:investors@bermudafranchisegroup.com" className="text-black">
                  investors@bermudafranchisegroup.com
                </a>
              </Text>
              <Text className="text-xs">
                This email was intended for{" "}
                <span className="text-black">{recipientEmail}</span>. If you were not expecting this email, you can ignore this email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
