import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface CapitalCallThresholdEmailProps {
  fundName: string;
  currentRaise: string;
  threshold: string;
}

export default function CapitalCallThresholdEmail({
  fundName,
  currentRaise,
  threshold,
}: CapitalCallThresholdEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Capital Call Threshold Reached for {fundName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Capital Call Threshold Reached</Heading>
          <Section style={section}>
            <Text style={text}>
              <strong>{fundName}</strong> has reached the configured capital call threshold.
            </Text>
            <Text style={text}>
              Current committed capital: <strong>{currentRaise}</strong>
            </Text>
            <Text style={text}>
              Threshold: <strong>{threshold}</strong>
            </Text>
            <Text style={text}>
              You can now proceed with capital calls for this fund.
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
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "400",
  color: "#484848",
  padding: "17px 0 0",
};

const section = {
  padding: "24px",
};

const text = {
  margin: "0 0 10px 0",
  color: "#484848",
  fontSize: "15px",
  lineHeight: "24px",
};
