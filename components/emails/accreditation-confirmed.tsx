import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { Footer } from "./shared/footer";

interface AccreditationConfirmedEmailProps {
  investorName: string;
  email: string;
  accreditationType: string;
  completedAt: string;
}

export function AccreditationConfirmedEmail({
  investorName = "Investor",
  email = "investor@example.com",
  accreditationType = "INCOME",
  completedAt = new Date().toISOString(),
}: AccreditationConfirmedEmailProps) {
  const accreditationLabel = 
    accreditationType === "INCOME_AND_NET_WORTH" 
      ? "Income and Net Worth" 
      : accreditationType === "INCOME" 
        ? "Income ($200K+)" 
        : "Net Worth ($1M+)";

  return (
    <Html>
      <Head />
      <Preview>Your accreditation has been confirmed</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section>
              <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
                <span className="font-bold tracking-tighter">BF Fund</span>
              </Text>
              <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
                Accreditation Confirmed
              </Heading>
            </Section>
            
            <Text className="text-sm leading-6 text-black">
              Dear {investorName},
            </Text>
            
            <Text className="text-sm leading-6 text-black">
              Thank you for completing your accredited investor verification. Your status has been confirmed and recorded for SEC 506(c) compliance.
            </Text>

            <Section className="my-6 rounded-lg bg-emerald-50 p-4">
              <Text className="m-0 text-sm font-semibold text-emerald-800">
                Verification Complete
              </Text>
              <Text className="m-0 mt-2 text-sm text-emerald-700">
                Accreditation Type: {accreditationLabel}
              </Text>
              <Text className="m-0 mt-1 text-sm text-emerald-700">
                Completed: {new Date(completedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </Section>

            <Text className="text-sm leading-6 text-black">
              You now have full access to your investor dashboard where you can:
            </Text>
            
            <Text className="text-sm leading-6 text-black">
              - View fund documents and reports<br />
              - Track your investments and capital calls<br />
              - Sign documents electronically<br />
              - Connect your bank account for transfers
            </Text>

            <Text className="mt-6 text-sm leading-6 text-gray-500">
              This confirmation has been recorded with your IP address and timestamp for compliance purposes.
            </Text>

            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default AccreditationConfirmedEmail;
