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

interface SignatureCompletedEmailProps {
  recipientName: string;
  documentTitle: string;
  teamName: string;
  completedAt: string;
  signersList: string[];
  documentUrl?: string;
}

export default function SignatureCompletedEmail({
  recipientName,
  documentTitle,
  teamName,
  completedAt,
  signersList,
  documentUrl,
}: SignatureCompletedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {`"${documentTitle}" has been signed by all parties`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Text style={headerText}>BF Fund Sign</Text>
          </Section>

          <Section style={contentSection}>
            <Text style={greeting}>Hello {recipientName},</Text>

            <Text style={paragraph}>
              Great news! The following document has been signed by all parties
              and is now complete:
            </Text>

            <Section style={documentBox}>
              <Text style={documentTitleStyle}>{documentTitle}</Text>
              <Text style={documentMeta}>
                Completed on {completedAt}
              </Text>
            </Section>

            <Section style={signersSection}>
              <Text style={signersLabel}>Signed by:</Text>
              {signersList.map((signer, index) => (
                <Text key={index} style={signerItem}>
                  ✓ {signer}
                </Text>
              ))}
            </Section>

            {documentUrl && (
              <Section style={buttonContainer}>
                <Button style={button} href={documentUrl}>
                  View Completed Document
                </Button>
              </Section>
            )}

            <Hr style={hr} />

            <Text style={footerText}>
              This document has been securely signed through BF Fund Sign.
              All signatures have been verified and logged with timestamps,
              IP addresses, and device information for legal compliance.
            </Text>

            <Text style={footerText}>
              Please keep this email for your records.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerBrand}>
              Powered by BF Fund Sign | {teamName}
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
  backgroundColor: "#10b981",
  padding: "24px",
  textAlign: "center" as const,
};

const headerText = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
};

const contentSection = {
  padding: "32px 40px",
};

const greeting = {
  fontSize: "18px",
  lineHeight: "28px",
  marginBottom: "16px",
  color: "#1a1a1a",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#4a4a4a",
  marginBottom: "24px",
};

const documentBox = {
  backgroundColor: "#ecfdf5",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
  borderLeft: "4px solid #10b981",
};

const documentTitleStyle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 8px 0",
};

const documentMeta = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
};

const signersSection = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const signersLabel = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "600",
  margin: "0 0 12px 0",
  textTransform: "uppercase" as const,
};

const signerItem = {
  fontSize: "14px",
  color: "#1a1a1a",
  margin: "0 0 8px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#10b981",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footerText = {
  fontSize: "13px",
  color: "#9ca3af",
  lineHeight: "22px",
  marginBottom: "8px",
};

const footer = {
  backgroundColor: "#f9fafb",
  padding: "24px",
  textAlign: "center" as const,
};

const footerBrand = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0",
};
