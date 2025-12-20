import React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { Footer } from "./shared/footer";

export default function CustomDomainSetup({
  name = "there",
  currentPlan = "Free",
  hasAccess = false,
}: {
  name?: string;
  currentPlan?: string;
  hasAccess?: boolean;
}) {
  const getPlanInfo = () => {
    if (hasAccess) {
      return {
        title: "Your custom domain is ready to set up! 🎉",
        subtitle: `Great news! Your ${currentPlan} plan includes custom domain access.`,
      };
    } else {
      return {
        title: "Interested in custom domains? 🚀",
        subtitle:
          "Learn how custom domains can enhance your document sharing experience.",
      };
    }
  };

  const { title, subtitle } = getPlanInfo();

  return (
    <Html>
      <Head />
      <Preview>Your custom domain setup</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <span className="font-bold tracking-tighter">BF Fund Dataroom</span>
            </Text>
            <Text className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              {title}
            </Text>
            <Text className="text-sm leading-6 text-black">Hi {name},</Text>
            <Text className="text-sm leading-6 text-black">{subtitle}</Text>

            {!hasAccess && (
              <>
                <Text className="text-sm leading-6 text-black">
                  <strong>Custom domains are available: </strong>
                </Text>
                <ul className="list-inside list-disc text-sm">
                  <li>
                    <strong>Business:</strong> Custom domain for documents
                  </li>
                  <li>
                    <strong>Data Rooms:</strong> Custom domain for data rooms
                  </li>
                  <li>
                    <strong>Data Rooms Plus:</strong> Unlimited custom domains
                    for data rooms and documents
                  </li>
                </ul>
              </>
            )}

            <Text className="text-sm leading-6 text-black">
              <strong>Setting up your custom domain:</strong>
            </Text>
            <ol className="list-inside list-decimal text-sm">
              <li>Choose your subdomain (e.g. docs.yourcompany.com)</li>
              <li>Add a CNAME record pointing to your domain</li>
              <li>Configure the domain in your settings</li>
              <li>Start sharing with your branded domain!</li>
            </ol>

            <Section className="my-8 text-center">
              <Button
                className="rounded bg-black text-center text-xs font-semibold text-white no-underline"
                href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://dataroom.bermudafranchisegroup.com'}/settings/domains`}
                style={{ padding: "12px 20px" }}
              >
                Set up your custom domain
              </Button>
            </Section>

            <Text className="text-sm leading-6 text-black">
              Need help? Reply to this email or contact us at{" "}
              <Link
                href="mailto:investors@bermudafranchisegroup.com"
                className="font-medium text-blue-600 no-underline"
              >
                investors@bermudafranchisegroup.com
              </Link>
              .
            </Text>

            <Footer footerText="If you have any questions about setting up your custom domain, simply reply to this email. We'd love to help you get started!" />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
