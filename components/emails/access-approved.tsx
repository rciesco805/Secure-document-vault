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
  Text,
} from "@react-email/components";

interface AccessApprovedEmailProps {
  recipientName?: string | null;
  dataroomName: string;
  teamName: string;
  accessUrl: string;
}

export default function AccessApprovedEmail({
  recipientName,
  dataroomName,
  teamName,
  accessUrl,
}: AccessApprovedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Your access to {dataroomName} has been approved
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Text style={headerText}>BF Fund Dataroom</Text>
          </Section>

          <Section style={contentSection}>
            <Text style={greeting}>
              {recipientName ? `Hello ${recipientName},` : "Hello,"}
            </Text>

            <Text style={paragraph}>
              Great news! Your request to access <strong>{dataroomName}</strong> has been approved.
            </Text>

            <Text style={paragraph}>
              You can now view the dataroom by clicking the button below. 
              You&apos;ll be signed in automatically with your email address.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={accessUrl}>
                Access Dataroom
              </Button>
            </Section>

            <Text style={smallText}>
              This link will take you directly to the dataroom.
            </Text>

            <Hr style={hr} />

            <Text style={footerText}>
              If you did not request access to this dataroom, you can safely ignore this email.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerBrand}>
              Powered by BF Fund Dataroom
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
  borderRadius: "8px",
  overflow: "hidden",
};

const headerSection = {
  backgroundColor: "#1a1a1a",
  padding: "24px",
  textAlign: "center" as const,
};

const headerText = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0",
};

const contentSection = {
  padding: "32px 24px",
};

const greeting = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 16px 0",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#4a5568",
  margin: "0 0 16px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#16a34a",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
};

const smallText = {
  fontSize: "14px",
  color: "#718096",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const footerText = {
  fontSize: "14px",
  color: "#718096",
  margin: "0",
};

const footer = {
  backgroundColor: "#f7fafc",
  padding: "16px 24px",
  textAlign: "center" as const,
};

const footerBrand = {
  fontSize: "12px",
  color: "#a0aec0",
  margin: "0",
};
