import React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export default function OtpEmailVerification({
  email = "test@example.co",
  code = "123456",
  isDataroom = false,
  logo,
  magicLink,
}: {
  email: string;
  code: string;
  isDataroom: boolean;
  logo?: string;
  magicLink?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Access Your {isDataroom ? "Dataroom" : "Document"}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <div className="mx-0 mb-8 mt-4 p-0 text-center">
              {logo ? (
                <Img
                  src={logo}
                  alt="Logo"
                  width="120"
                  height="36"
                  className="mx-auto"
                />
              ) : (
                <Text className="text-2xl font-normal">
                  <span className="font-bold tracking-tighter">BF Fund Dataroom</span>
                </Text>
              )}
            </div>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Access Your {isDataroom ? "Dataroom" : "Document"}
            </Heading>
            
            {magicLink && (
              <>
                <Text className="mx-auto text-sm leading-6 text-center">
                  Click the button below to access the {isDataroom ? "dataroom" : "document"} directly:
                </Text>
                <Section className="my-6 text-center">
                  <Button
                    className="rounded bg-black px-6 py-3 text-center text-sm font-semibold text-white no-underline"
                    href={magicLink}
                  >
                    Access {isDataroom ? "Dataroom" : "Document"}
                  </Button>
                </Section>
                <Text className="text-xs text-center text-gray-500 mb-4">
                  or copy this link:{" "}
                  <Link 
                    href={magicLink} 
                    className="text-blue-600 underline"
                    style={{ wordBreak: "break-all" }}
                  >
                    {magicLink.replace(/^https?:\/\//, "").substring(0, 50)}...
                  </Link>
                </Text>
                <Hr className="my-6" />
                <Text className="mx-auto text-sm leading-6 text-gray-600 text-center">
                  Alternatively, enter this verification code:
                </Text>
              </>
            )}
            
            {!magicLink && (
              <Text className="mx-auto text-sm leading-6">
                Enter this code on the verification page to access the{" "}
                {isDataroom ? "dataroom" : "document"}:
              </Text>
            )}
            
            <Section className="my-6">
              <div className="mx-auto w-fit rounded-xl bg-gray-100 px-6 py-3 text-center font-mono text-2xl font-semibold tracking-[0.25em]">
                {code}
              </div>
            </Section>
            <Text className="text-sm leading-6 text-black text-center">
              This {magicLink ? "link and code expire" : "code expires"} in 20 minutes.
            </Text>
            <Hr />
            <Section className="mt-8 text-gray-400">
              <Text className="text-xs">
                This email was intended for{" "}
                <span className="text-black">{email}</span>. If you were not
                expecting this email, you can ignore it. If you have any
                feedback or questions, simply reply to this email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
