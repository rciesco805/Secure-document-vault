import {
  Body,
  Head,
  Html,
  Link,
  Tailwind,
  Text,
} from "@react-email/components";

interface HundredViewsCongratsEmailProps {
  name: string | null | undefined;
}

const HundredViewsCongratsEmail = ({
  name,
}: HundredViewsCongratsEmailProps) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="font-sans text-sm">
          <Text>Hi{name && ` ${name}`},</Text>
          <Text>
            Congratulations on reaching 100 views on your documents in the BF Fund Dataroom!
          </Text>
          <Text>
            We appreciate your continued use of our platform. If you have any questions or feedback, please don&apos;t hesitate to reach out to us.
          </Text>
          <Text>
            Best regards,
            <br />
            The BF Fund Team
          </Text>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default HundredViewsCongratsEmail;
