import React from "react";

import {
  Body,
  Head,
  Html,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";

interface UpgradePersonalEmailProps {
  name: string | null | undefined;
  planName?: string;
}

const UpgradePersonalEmail = ({
  name,
  planName = "Pro",
}: UpgradePersonalEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {planName}</Preview>
      <Tailwind>
        <Body className="font-sans text-sm">
          <Text>Hi{name && ` ${name}`},</Text>
          <Text>
            Welcome to BF Fund Dataroom! Thanks for upgrading!
            We&apos;re thrilled to have you on our {planName} plan.
          </Text>
          <Text>
            You now have access to advanced features. If you have any questions,
            please reach out to investors@bermudafranchisegroup.com.
          </Text>
          <Text>The BF Fund Team</Text>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default UpgradePersonalEmail;
