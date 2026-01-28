import React from "react";

import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { UploadIcon } from "lucide-react";

interface YearInReviewEmailProps {
  year: number;
  minutesSpentOnDocs: number;
  uploadedDocuments: number;
  sharedLinks: number;
  receivedViews: number;
  topDocumentName: string;
  topDocumentViews: number;
  mostActiveMonth: string;
  mostActiveMonthViews: number;
  sharerPercentile: number;
  viewingLocations: string[];
  unsubscribeUrl: string;
}

export default function YearInReviewEmail({
  year = 2024,
  minutesSpentOnDocs = 1234,
  uploadedDocuments = 25,
  sharedLinks = 50,
  receivedViews = 500,
  topDocumentName = "Q4 Financial Report",
  topDocumentViews = 150,
  mostActiveMonth = "September",
  mostActiveMonthViews = 200,
  sharerPercentile = 95,
  viewingLocations = ["United States", "United Kingdom", "Germany", "Japan"],
  unsubscribeUrl,
}: YearInReviewEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>See your stats from 2024</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto w-full max-w-[600px] p-0">
            <Section className="p-8 text-center">
              <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
                <span className="font-bold tracking-tighter">BF Fund Dataroom</span>
              </Text>
              <Text className="text-sm font-normal uppercase tracking-wider">
                {year} in review
              </Text>
              <Heading className="my-4 text-4xl font-medium leading-tight">
                Your Year with BF Fund Dataroom
              </Heading>
              <Text className="mb-8 text-lg leading-8">
                What a year it&apos;s been! Let&apos;s take a look at how
                you&apos;ve shared your important documents.
              </Text>
            </Section>

            <Section className="my-6 rounded-2xl bg-[#fb7a00]/10 bg-[radial-gradient(circle_at_bottom_right,#fb7a00_0%,transparent_60%)] p-8 text-center">
              <Heading className="m-0 text-3xl font-medium text-[#a63b00]">
                Viewers spent
              </Heading>
              <Text className="my-4 text-7xl font-bold leading-none text-gray-900">
                {minutesSpentOnDocs}
              </Text>
              <Text className="mb-4 text-3xl font-medium text-gray-900">
                minutes on your documents
              </Text>
              <Text className="text-sm leading-5 text-gray-900">
                That&apos;s a lot of engagement! Your documents are resonating
                with your visitors.
              </Text>

              <Hr className="mt-6" style={{ borderColor: "#fb7a00" }} />
              <Heading className="pt-5 text-xs font-medium uppercase tracking-wider text-gray-900">
                Your activity
              </Heading>
              <Row className="mt-5">
                <Column className="w-1/3 text-center">
                  <Text className="text-sm font-medium text-[#a63b00]">
                    You uploaded
                  </Text>
                  <Text className="my-1 text-4xl font-bold text-gray-900">
                    {uploadedDocuments}
                  </Text>
                  <Text className="text-2xl text-gray-900">documents</Text>
                </Column>
                <Column className="w-1/3 text-center">
                  <Text className="text-sm font-medium text-[#a63b00]">
                    You shared
                  </Text>
                  <Text className="my-1 text-4xl font-bold text-gray-900">
                    {sharedLinks}
                  </Text>
                  <Text className="text-2xl text-gray-900">links</Text>
                </Column>
                <Column className="w-1/3 text-center">
                  <Text className="text-sm font-medium text-[#a63b00]">
                    You received
                  </Text>
                  <Text className="my-1 text-4xl font-bold text-gray-900">
                    {receivedViews}
                  </Text>
                  <Text className="text-2xl text-gray-900">views</Text>
                </Column>
              </Row>
            </Section>

            <Section className="my-6 rounded-2xl bg-[#4b5563]/10 bg-[radial-gradient(circle_at_bottom_right,#4b5563_0%,transparent_60%)] p-8 text-center">
              <Heading className="m-0 text-3xl font-medium text-gray-800">
                Your top document
              </Heading>
              <Text className="my-4 text-2xl font-bold leading-none text-gray-900">
                &quot;{topDocumentName}&quot;
              </Text>
              <Text className="mb-4 text-5xl font-medium text-gray-900">
                {topDocumentViews} views
              </Text>
              <Text className="text-sm leading-5 text-gray-900">
                This document really caught your visitor&apos;s attention!
              </Text>
            </Section>

            <Section className="my-6 rounded-2xl bg-[#e4c5a0]/10 bg-[radial-gradient(circle_at_bottom_right,#e4c5a0_0%,transparent_60%)] p-8 text-center">
              <Heading className="m-0 text-3xl font-medium text-[#9c7b4a]">
                Your most active month
              </Heading>
              <Text className="my-4 text-5xl font-bold leading-none text-gray-900">
                {mostActiveMonth}
              </Text>
              <Text className="mb-4 text-3xl font-medium text-gray-900">
                with {mostActiveMonthViews} views
              </Text>
              <Text className="text-sm leading-5 text-gray-900">
                {mostActiveMonth} was your busiest month. What did you share
                that got so much attention?
              </Text>

              <Hr className="mt-6" style={{ borderColor: "#e4c5a0" }} />
              {sharerPercentile <= 10 ? (
                <>
                  <Heading className="pt-5 text-xs font-medium uppercase tracking-wider text-gray-900">
                    You&apos;re in the top
                  </Heading>
                  <Text className="my-4 text-7xl font-bold leading-none text-gray-900">
                    {sharerPercentile}%
                  </Text>
                  <Text className="mb-4 text-xl font-medium text-gray-900">
                    of sharers on BF Fund Dataroom
                  </Text>
                  <Text className="text-sm leading-5 text-gray-900">
                    You&apos;re one of our most active users. Thank you for
                    sharing with BF Fund Dataroom!
                  </Text>
                </>
              ) : (
                <>
                  <Heading className="pt-5 text-xs font-medium uppercase tracking-wider text-gray-900">
                    So close to the top 10%
                  </Heading>
                  <Text className="my-4 text-2xl font-medium text-gray-900">
                    Keep up sharing in 2025!
                  </Text>
                </>
              )}
            </Section>

            <Section className="my-6 rounded-2xl bg-[#10b981]/10 bg-[radial-gradient(circle_at_bottom_right,#10b981_0%,transparent_60%)] p-8 text-center">
              <Heading className="m-0 text-3xl font-medium text-[#065f46]">
                Your documents were viewed from
              </Heading>
              <Row className="mt-4">
                <Column>
                  {viewingLocations.map((location, index) => (
                    <Text
                      key={index}
                      className="rounded-full bg-[#10b981] px-3 py-1 text-sm font-medium text-white"
                      style={{
                        margin: "4px 4px",
                        display: "inline-block",
                      }}
                    >
                      {location}
                    </Text>
                  ))}
                </Column>
              </Row>
              <Text className="mt-4 text-sm leading-5 text-[#065f46]">
                Your documents get attention from all over the world!
              </Text>
            </Section>

            <Section className="pb-6 text-center">
              <Text className="text-xl leading-8 text-gray-900">
                We&apos;re excited to support you next year! <br />
                Happy Holidays from the BF Fund Team :)
              </Text>
              <Link
                href={`${process.env.NEXT_PUBLIC_BASE_URL}/documents`}
                className="mt-4 inline-flex items-center rounded-full bg-gray-900 px-12 py-4 text-center text-sm font-bold text-white no-underline"
              >
                Go to your dashboard
              </Link>
            </Section>

            <Hr />
            <Section className="mt-8 text-gray-400">
              <Text className="text-xs">
                © {new Date().getFullYear()} Bermuda Franchise Group, LLC. All rights reserved.
              </Text>
              <Text className="text-xs">
                You received this Year in Review email because you have an
                account with BF Fund Dataroom during {year}. If you have any feedback or
                questions about this email, please contact investors@bermudafranchisegroup.com. To unsubscribe
                from future Year in Review emails,{" "}
                <a
                  href={unsubscribeUrl}
                  className="text-gray-400 underline underline-offset-2"
                >
                  click here
                </a>
                .
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
