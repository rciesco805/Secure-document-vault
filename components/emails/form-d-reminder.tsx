import React from "react";

import {
  Body,
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

interface FormDReminderEmailProps {
  fundName: string;
  deadline: string;
  daysRemaining: number;
  secFilingUrl?: string;
}

const FormDReminderEmail = ({
  fundName,
  deadline,
  daysRemaining,
  secFilingUrl = "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=&CIK=&type=D&dateb=&owner=include&count=40&search_text=",
}: FormDReminderEmailProps) => {
  const previewText = `Form D Filing Reminder - ${daysRemaining} days remaining`;
  const isUrgent = daysRemaining <= 7;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <span className="font-bold tracking-tighter">Form D Filing Reminder</span>
            </Text>

            {isUrgent && (
              <Section className="mb-4 rounded bg-red-50 p-4">
                <Text className="m-0 text-sm font-semibold text-red-800">
                  Urgent: Only {daysRemaining} days remaining until deadline
                </Text>
              </Section>
            )}

            <Text className="text-sm">
              This is a reminder that the Form D filing for{" "}
              <strong>{fundName}</strong> is due on{" "}
              <strong>{deadline}</strong>.
            </Text>

            <Text className="text-sm">
              {daysRemaining > 0
                ? `You have ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining to complete this filing.`
                : "This filing is now past due. Please file immediately."}
            </Text>

            <Section className="my-6 rounded bg-gray-50 p-4">
              <Text className="m-0 text-sm font-semibold">Key Information:</Text>
              <ul className="list-inside list-disc text-sm">
                <li>Fund: {fundName}</li>
                <li>Deadline: {deadline}</li>
                <li>Days Remaining: {daysRemaining}</li>
              </ul>
            </Section>

            <Text className="text-sm">
              Form D filings must be submitted within 15 days after the first sale of
              securities in a Regulation D offering. Failure to file Form D does not
              affect the availability of the exemption, but late filings may result
              in regulatory scrutiny.
            </Text>

            <Text className="text-sm">
              You can file Form D electronically through the SEC&apos;s EDGAR system at:{" "}
              <Link
                href={secFilingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                SEC EDGAR Filing System
              </Link>
            </Text>

            <Section className="mt-8">
              <Text className="text-sm text-gray-400">The BF Fund Team</Text>
            </Section>
            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default FormDReminderEmail;
