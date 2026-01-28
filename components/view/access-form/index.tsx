import { useEffect, useState } from "react";

import { Brand, CustomField, DataroomBrand } from "@prisma/client";
import { ArrowUpRightIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { determineTextColor } from "@/lib/utils/determine-text-color";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import AgreementSection from "./agreement-section";
import CustomFieldsSection from "./custom-fields-section";
import EmailSection from "./email-section";
import NameSection from "./name-section";
import PasswordSection from "./password-section";

export const DEFAULT_ACCESS_FORM_DATA = {
  email: null,
  password: null,
};

export type DEFAULT_ACCESS_FORM_TYPE = {
  email: string | null;
  password: string | null;
  hasConfirmedAgreement?: boolean;
  name?: string | null;
  customFields?: { [key: string]: string };
};

export default function AccessForm({
  data,
  email,
  brand,
  setData,
  onSubmitHandler,
  requireEmail,
  requirePassword,
  requireAgreement,
  agreementName,
  agreementContent,
  agreementContentType,
  requireName,
  isLoading,
  linkId,
  disableEditEmail,
  useCustomAccessForm,
  customFields,
  logoOnAccessForm,
  linkWelcomeMessage,
}: {
  data: DEFAULT_ACCESS_FORM_TYPE;
  email: string | null | undefined;
  setData: React.Dispatch<React.SetStateAction<DEFAULT_ACCESS_FORM_TYPE>>;
  onSubmitHandler: React.FormEventHandler<HTMLFormElement>;
  brand?: Partial<Brand> | Partial<DataroomBrand> | null;
  requireEmail: boolean;
  requirePassword: boolean;
  requireAgreement?: boolean;
  agreementName?: string;
  agreementContent?: string;
  agreementContentType?: string;
  requireName?: boolean;
  isLoading: boolean;
  linkId?: string;
  disableEditEmail?: boolean;
  useCustomAccessForm?: boolean;
  customFields?: Partial<CustomField>[];
  logoOnAccessForm?: boolean;
  linkWelcomeMessage?: string | null;
}) {
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [accessRequestStatus, setAccessRequestStatus] = useState<"idle" | "pending" | "approved" | "error">("idle");

  const handleRequestAccess = async () => {
    if (!data.email || !linkId) {
      toast.error("Please enter your email first");
      return;
    }

    setIsRequestingAccess(true);
    try {
      const response = await fetch(`/api/links/${linkId}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          message: requestMessage,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.status === "APPROVED") {
          setAccessRequestStatus("approved");
          toast.success(result.message);
        } else {
          setAccessRequestStatus("pending");
          toast.success(result.message);
        }
      } else {
        toast.error(result.message || "Failed to submit access request");
        setAccessRequestStatus("error");
      }
    } catch (error) {
      console.error("Request access error:", error);
      toast.error("Failed to submit access request");
      setAccessRequestStatus("error");
    } finally {
      setIsRequestingAccess(false);
    }
  };

  useEffect(() => {
    const userEmail = email;
    if (userEmail) {
      setData((prevData: DEFAULT_ACCESS_FORM_TYPE) => ({
        ...prevData,
        email: userEmail || prevData.email,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const isFormValid = () => {
    if (requireEmail) {
      if (!data.email || !isEmailValid) return false;
    }
    if (requirePassword && !data.password) return false;
    if (requireAgreement && !data.hasConfirmedAgreement) return false;
    if (requireAgreement && requireName && !data.name) return false;
    if (customFields?.length) {
      for (const field of customFields) {
        if (field.required) {
          const fieldValue = data.customFields?.[field.identifier!];
          // For checkbox fields, required means it must be checked (true)
          if (field.type === "CHECKBOX") {
            if (fieldValue !== "true") {
              return false;
            }
          } else {
            // For other field types, required means it must have a value
            if (!fieldValue) {
              return false;
            }
          }
        }
      }
    }
    return true;
  };

  const updateCustomFields = (fields: { [key: string]: string }) => {
    setData((prevData) => ({
      ...prevData,
      customFields: fields,
    }));
  };

  return (
    <div
      className="flex h-full min-h-dvh flex-col justify-between pb-4"
      style={{
        backgroundColor:
          brand && brand.accentColor ? brand.accentColor : "black",
      }}
    >
      {/* Light Navbar */}
      {logoOnAccessForm && brand && brand.logo && (
        <nav
          className="w-full"
          style={{
            backgroundColor: brand.brandColor ? brand.brandColor : "black",
          }}
        >
          <div className="flex h-16 items-center justify-start px-2 sm:px-6 lg:px-8">
            <img
              src={brand.logo as string}
              alt="Brand Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
        </nav>
      )}

      <div className="flex flex-1 flex-col px-6 pb-12 pt-8 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1
            className="mt-10 text-2xl font-bold leading-9 tracking-tight text-white"
            style={{
              color: determineTextColor(brand?.accentColor),
            }}
          >
            {linkWelcomeMessage ||
              (brand && "welcomeMessage" in brand && brand.welcomeMessage) ||
              "Your action is requested to continue"}
          </h1>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
          <form className="space-y-4" onSubmit={onSubmitHandler} translate="no">
            {requireAgreement && agreementContent && requireName ? (
              <NameSection {...{ data, setData, brand }} />
            ) : null}
            {requireEmail ? (
              <EmailSection
                {...{ data, setData, brand }}
                disableEditEmail={disableEditEmail}
                useCustomAccessForm={useCustomAccessForm}
                onValidationChange={setIsEmailValid}
              />
            ) : null}
            {requirePassword ? (
              <PasswordSection {...{ data, setData, brand }} />
            ) : null}
            {customFields?.length ? (
              <CustomFieldsSection
                fields={customFields}
                data={data.customFields || {}}
                setData={updateCustomFields}
                brand={brand}
              />
            ) : null}
            {requireAgreement && agreementContent && agreementName ? (
              <AgreementSection
                {...{ data, setData, brand }}
                agreementContent={agreementContent}
                agreementName={agreementName}
                agreementContentType={agreementContentType}
                useCustomAccessForm={useCustomAccessForm}
              />
            ) : null}

            {accessRequestStatus === "pending" ? (
              <div className="flex flex-col items-center gap-4 pt-5">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2Icon className="h-5 w-5" />
                  <span className="font-medium">Request Submitted</span>
                </div>
                <p
                  className="text-center text-sm"
                  style={{ color: determineTextColor(brand?.accentColor) === "white" ? "rgb(156, 163, 175)" : "rgb(107, 114, 128)" }}
                >
                  Your access request is pending review. You will receive an email once approved.
                </p>
              </div>
            ) : showRequestAccess ? (
              <div className="space-y-4 pt-4">
                <div>
                  <label
                    htmlFor="request-message"
                    className="block text-sm font-medium mb-2"
                    style={{ color: determineTextColor(brand?.accentColor) }}
                  >
                    Message (optional)
                  </label>
                  <Textarea
                    id="request-message"
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Tell us why you need access..."
                    className="bg-white/10 border-gray-600"
                    style={{ color: determineTextColor(brand?.accentColor) }}
                    rows={3}
                  />
                </div>
                <div className="flex justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRequestAccess(false)}
                    className="border-gray-600"
                    style={{ color: determineTextColor(brand?.accentColor) }}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRequestAccess}
                    disabled={!data.email || isRequestingAccess}
                    className="bg-white text-gray-950 hover:bg-white/90"
                    style={{
                      backgroundColor: determineTextColor(brand?.accentColor),
                      color: brand && brand.accentColor ? brand.accentColor : "black",
                    }}
                  >
                    {isRequestingAccess ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Requesting...
                      </>
                    ) : (
                      "Request Access"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 pt-5">
                <Button
                  type="submit"
                  disabled={!isFormValid()}
                  className="w-1/3 min-w-fit bg-white text-gray-950 hover:bg-white/90"
                  loading={isLoading}
                  style={{
                    backgroundColor: determineTextColor(brand?.accentColor),
                    color:
                      brand && brand.accentColor ? brand.accentColor : "black",
                  }}
                >
                  Continue
                </Button>
                {linkId && requireEmail && (
                  <button
                    type="button"
                    onClick={() => setShowRequestAccess(true)}
                    className="text-sm underline underline-offset-2 hover:no-underline"
                    style={{ color: determineTextColor(brand?.accentColor) === "white" ? "rgb(156, 163, 175)" : "rgb(107, 114, 128)" }}
                  >
                    Don&apos;t have access? Request it here
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
      {!useCustomAccessForm ? (
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-center text-sm tracking-tight text-gray-500">
            This document is securely shared with you using{" "}
            <a
              href="https://bermudafranchisegroup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-gray-600"
            >
              BF Fund Dataroom
            </a>
            .
          </p>
          <p className="text-center text-sm tracking-tight text-gray-500">
            See how we protect your data in our{" "}
            <a
              href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-gray-600"
            >
              <span>Privacy Policy</span>
              <ArrowUpRightIcon className="h-3 w-3" />
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}
