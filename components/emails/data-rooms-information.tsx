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

const DataRoomsInformationEmail = () => {
  const previewText = `The document sharing infrastructure for the modern web`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <span className="font-bold tracking-tighter">BF Fund Dataroom</span>
            </Text>
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              Virtual Data Rooms
            </Text>
            <Text className="text-sm">Unlimited branded data rooms!</Text>
            <Text className="text-sm">
              With BF Fund Dataroom you can:
            </Text>
            <ul className="list-inside list-disc text-sm">
              <li>Share data rooms with one link</li>
              <li>Upload unlimited files</li>
              <li>Create unlimited folders and subfolders</li>
              <li>
                Connect your <strong>custom domain 💫</strong>{" "}
              </li>
              <li>Create fully branded experience </li>
              <li>Use advanced link settings</li>
            </ul>
            <Text className="text-sm">
              Explore all data room features and capabilities.
            </Text>
            <Section className="my-8 text-center">
              <Button
                className="rounded bg-black text-center text-xs font-semibold text-white no-underline"
                href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://dataroom.bermudafranchisegroup.com'}/datarooms`}
                style={{ padding: "12px 20px" }}
              >
                Create new data room
              </Button>
            </Section>
            <Text className="text-sm">
              If you have any questions, please contact us at{" "}
              <a
                href="mailto:investors@bermudafranchisegroup.com"
                className="text-blue-500 underline"
              >
                investors@bermudafranchisegroup.com
              </a>
              .
            </Text>
            <Footer
              withAddress={false}
              footerText="This is a last onboarding email. If you have any feedback or questions about this email, simply reply to it. I'd love to hear from you!"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default DataRoomsInformationEmail;
