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

interface AccessRequestNotificationEmailProps {
  requesterEmail: string;
  requesterName?: string;
  requesterMessage?: string;
  dataroomName: string;
  teamName: string;
  approvalUrl: string;
}

export default function AccessRequestNotificationEmail({
  requesterEmail,
  requesterName,
  requesterMessage,
  dataroomName,
  teamName,
  approvalUrl,
}: AccessRequestNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {`New access request for ${dataroomName} from ${requesterName || requesterEmail}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Text style={headerText}>BF Fund Dataroom</Text>
          </Section>

          <Section style={contentSection}>
            <Text style={greeting}>Access Request Received</Text>

            <Text style={paragraph}>
              A new access request has been submitted for <strong>{dataroomName}</strong>.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailLabel}>Requester:</Text>
              <Text style={detailValue}>
                {requesterName ? `${requesterName} (${requesterEmail})` : requesterEmail}
              </Text>
              
              {requesterMessage && (
                <>
                  <Text style={detailLabel}>Message:</Text>
                  <Text style={detailValue}>&quot;{requesterMessage}&quot;</Text>
                </>
              )}
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={approvalUrl}>
                Review Request
              </Button>
            </Section>

            <Text style={smallText}>
              Click the button above to approve or deny this access request.
            </Text>

            <Hr style={hr} />

            <Text style={footerText}>
              This request is for the {teamName} dataroom.
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
  fontSize: "24px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 16px 0",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#4a5568",
  margin: "0 0 24px 0",
};

const detailsBox = {
  backgroundColor: "#f7fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  padding: "16px",
  marginBottom: "24px",
};

const detailLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#718096",
  textTransform: "uppercase" as const,
  margin: "0 0 4px 0",
};

const detailValue = {
  fontSize: "14px",
  color: "#2d3748",
  margin: "0 0 12px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#1a1a1a",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
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
