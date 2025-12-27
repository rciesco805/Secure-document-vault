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

export default function InviteRequest({
  email,
  fullName,
  company,
  signInUrl,
}: {
  email: string;
  fullName: string;
  company: string;
  signInUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>New Investor Access Request from {fullName}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <span className="font-bold tracking-tighter">BF Fund Investor Portal</span>
            </Text>
            <Text className="font-semibold mx-0 mb-8 mt-4 p-0 text-center text-xl">
              New Access Request
            </Text>
            <Text className="text-sm leading-6 text-black">
              A new investor has requested access to the BF Fund Investor Portal.
            </Text>
            <Hr className="my-4 border-gray-300" />
            <Text className="text-sm leading-6 text-black">
              <span className="font-semibold">Full Name:</span> {fullName}
            </Text>
            <Text className="text-sm leading-6 text-black">
              <span className="font-semibold">Email:</span> {email}
            </Text>
            <Text className="text-sm leading-6 text-black">
              <span className="font-semibold">Company:</span> {company}
            </Text>
            <Hr className="my-4 border-gray-300" />
            <Section className="my-6 text-center">
              <Button
                className="rounded-md bg-black px-6 py-3 text-center text-sm font-medium text-white no-underline"
                href={signInUrl}
              >
                Enter Fund Dataroom
              </Button>
            </Section>
            <Text className="text-sm leading-6 text-gray-600 text-center">
              Click the button above to access the dataroom and grant access to this investor.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
