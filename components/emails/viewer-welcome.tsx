import React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { Footer } from "./shared/footer";

interface ViewerWelcomeEmailProps {
  name: string | null | undefined;
  dataroomName?: string;
  accessLink?: string;
}

const ViewerWelcomeEmail = ({ name, dataroomName, accessLink }: ViewerWelcomeEmailProps) => {
  const previewText = `You've been granted access to view investor documents`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <span className="font-bold tracking-tighter">BF Fund Investor Portal</span>
            </Text>
            <Text className="text-sm">
              Hello{name && ` ${name}`},
            </Text>
            <Text className="text-sm">
              {dataroomName ? (
                <>
                  You&apos;ve been granted access to <strong>{dataroomName}</strong>. 
                  Click the button below to view the investor documents.
                </>
              ) : (
                <>
                  Welcome to the BF Fund Investor Portal. You now have access to view 
                  investor documents shared with you.
                </>
              )}
            </Text>
            
            <Section className="my-8 text-center">
              <Button
                className="rounded bg-black text-center text-xs font-semibold text-white no-underline"
                href={accessLink || `${process.env.NEXT_PUBLIC_BASE_URL}/viewer-portal`}
                style={{ padding: "12px 20px" }}
              >
                View Documents
              </Button>
            </Section>

            <Text className="text-sm text-gray-600">
              This link is personal to you. Please do not share it with others.
            </Text>

            <Section className="mt-4">
              <Text className="text-sm">
                If you have any questions, please contact us at{" "}
                <Link
                  href="mailto:investors@bermudafranchisegroup.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  investors@bermudafranchisegroup.com
                </Link>
              </Text>

              <Text className="text-sm text-gray-400">The BF Fund Team</Text>
            </Section>
            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ViewerWelcomeEmail;
