import React from "react";

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";

export default function InviteRequest({
  email,
  fullName,
  company,
}: {
  email: string;
  fullName: string;
  company: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>New Investor Access Request</Preview>
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
            <Text className="text-sm leading-6 text-gray-600">
              To grant access, invite this user through the admin portal.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
