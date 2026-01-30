import { Hr, Section, Text } from "@react-email/components";

export const Footer = ({
  withAddress = false,
  footerText = "If you have any feedback or questions, please contact investors@bermudafranchisegroup.com",
}: {
  withAddress?: boolean;
  footerText?: string | React.ReactNode;
}) => {
  return (
    <>
      <Hr />
      <Section className="text-gray-400">
        <Text className="text-xs">
          © {new Date().getFullYear()} Bermuda Franchise Group. All rights reserved.{" "}
          {withAddress && (
            <>
              <br />
              Work Well. Play Well. Be Well.
            </>
          )}
        </Text>
        <Text className="text-xs">{footerText}</Text>
      </Section>
    </>
  );
};
