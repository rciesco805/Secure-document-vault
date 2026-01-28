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

interface SignatureRequestEmailProps {
  recipientName: string;
  documentTitle: string;
  senderName: string;
  teamName: string;
  message?: string;
  signingUrl: string;
}

export default function SignatureRequestEmail({
  recipientName,
  documentTitle,
  senderName,
  teamName,
  message,
  signingUrl,
}: SignatureRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {`${senderName} has requested your signature on "${documentTitle}"`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Text style={headerText}>BF Fund Sign</Text>
          </Section>

          <Section style={contentSection}>
            <Text style={greeting}>Hello {recipientName},</Text>

            <Text style={paragraph}>
              <strong>{senderName}</strong> from <strong>{teamName}</strong> has
              requested your signature on the following document:
            </Text>

            <Section style={documentBox}>
              <Text style={documentTitleStyle}>{documentTitle}</Text>
            </Section>

            {message && (
              <Section style={messageBox}>
                <Text style={messageLabel}>Message from sender:</Text>
                <Text style={messageText}>&quot;{message}&quot;</Text>
              </Section>
            )}

            <Section style={buttonContainer}>
              <Button style={button} href={signingUrl}>
                Review and Sign Document
              </Button>
            </Section>

            <Text style={smallText}>
              This link will take you directly to the document where you can
              review and add your signature.
            </Text>

            <Hr style={hr} />

            <Text style={footerText}>
              If you did not expect this request, please contact{" "}
              {teamName} directly before taking any action.
            </Text>

            <Text style={footerText}>
              Do not forward this email - the signing link is unique to you.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerBrand}>
              Powered by BF Fund Sign
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
  backgroundColor: "#000000",
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
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
  borderLeft: "4px solid #000000",
};

const documentTitleStyle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0",
};

const messageBox = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const messageLabel = {
  fontSize: "12px",
  color: "#92400e",
  fontWeight: "600",
  margin: "0 0 8px 0",
  textTransform: "uppercase" as const,
};

const messageText = {
  fontSize: "14px",
  color: "#78350f",
  margin: "0",
  fontStyle: "italic",
};

const buttonContainer = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#000000",
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
  fontSize: "13px",
  color: "#6b7280",
  textAlign: "center" as const,
  marginBottom: "24px",
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
