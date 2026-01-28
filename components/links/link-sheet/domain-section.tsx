import Link from "next/link";

import { Dispatch, SetStateAction, useEffect, useState } from "react";

import { useTeam } from "@/context/team-context";
import { PlanEnum } from "@/ee/stripe/constants";
import { Domain, LinkType } from "@prisma/client";
import { mutate } from "swr";

import { BLOCKED_PATHNAMES } from "@/lib/constants";
import { BasePlan, usePlan } from "@/lib/swr/use-billing";
import useLimits from "@/lib/swr/use-limits";
import { cn } from "@/lib/utils";

import { UpgradePlanModal } from "@/components/billing/upgrade-plan-modal";
import { AddDomainModal } from "@/components/domains/add-domain-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DEFAULT_LINK_TYPE } from ".";

export default function DomainSection({
  data,
  setData,
  domains,
  linkType,
  editLink,
}: {
  data: DEFAULT_LINK_TYPE;
  setData: Dispatch<SetStateAction<DEFAULT_LINK_TYPE>>;
  domains?: Domain[];
  linkType: Omit<LinkType, "WORKFLOW_LINK">;
  editLink?: boolean;
}) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>("");
  const teamInfo = useTeam();
  const { limits } = useLimits();

  const { isBusiness, isDatarooms, isDataroomsPlus } = usePlan();

  // Check plan eligibility for custom domains
  const canUseCustomDomainForDocument =
    isBusiness || isDatarooms || isDataroomsPlus || limits?.customDomainOnPro;
  const canUseCustomDomainForDataroom =
    isDatarooms || isDataroomsPlus || limits?.customDomainInDataroom;

  // Get the first available domain as fallback
  const getDefaultDomainSlug = () => {
    const defaultDomain = domains?.find((d) => d.isDefault);
    if (defaultDomain) return defaultDomain.slug;
    if (domains && domains.length > 0) return domains[0].slug;
    return "";
  };

  // Check if we're editing a link with a custom domain
  const isEditingCustomDomain =
    editLink && data.domain ? true : false;

  const handleDomainChange = (value: string) => {
    const fallbackDomain = getDefaultDomainSlug();
    const canChangeCustomDomain =
      linkType === "DOCUMENT_LINK"
        ? canUseCustomDomainForDocument
        : canUseCustomDomainForDataroom;

    // When editing and user doesn't have permission, prevent changes
    if (isEditingCustomDomain && !canChangeCustomDomain) {
      setDisplayValue(data.domain ?? fallbackDomain);
      return;
    }

    // Handle opening the add domain modal
    if (value === "add_domain" || value === "add_dataroom_domain") {
      setModalOpen(true);
      setData({ ...data, domain: fallbackDomain });
      setDisplayValue(fallbackDomain);
      return;
    }

    // Check plan eligibility for custom domains
    if (!canChangeCustomDomain) {
      setUpgradeModalOpen(true);
      setData({ ...data, domain: fallbackDomain });
      setDisplayValue(fallbackDomain);
      return;
    }

    // Update domain normally if allowed
    setData({ ...data, domain: value });
    setDisplayValue(value);
  };

  const handleSelectFocus = () => {
    // Assuming your fetcher key for domains is '/api/teams/:teamId/domains'
    mutate(`/api/teams/${teamInfo?.currentTeam?.id}/domains`);
  };

  useEffect(() => {
    if (domains && !editLink) {
      const domainValue = getDefaultDomainSlug();

      if (domainValue) {
        setData({
          ...data,
          domain: domainValue,
        });
        setDisplayValue(domainValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    domains,
    editLink,
    linkType,
    isBusiness,
    isDatarooms,
    isDataroomsPlus,
    limits,
  ]);

  // Set defaultDomain based on available domains
  const defaultDomain = editLink
    ? (data.domain ?? getDefaultDomainSlug())
    : getDefaultDomainSlug();

  // Set the initial display value when component mounts
  useEffect(() => {
    setDisplayValue(defaultDomain);
  }, [defaultDomain, editLink]);

  const currentDomain = domains?.find((domain) => domain.slug === data.domain);
  const isDomainVerified = currentDomain?.verified;

  const isDisabled =
    linkType === "DOCUMENT_LINK"
      ? isEditingCustomDomain && !canUseCustomDomainForDocument
      : isEditingCustomDomain && !canUseCustomDomainForDataroom;

  return (
    <>
      <Label htmlFor="link-domain">Domain</Label>
      <div className="flex">
        <Select
          value={displayValue}
          onValueChange={handleDomainChange}
          onOpenChange={handleSelectFocus}
          disabled={isDisabled}
        >
          <SelectTrigger
            className="flex h-10 w-full rounded-none rounded-l-md border border-input bg-white text-foreground placeholder-muted-foreground focus:border-muted-foreground focus:outline-none focus:ring-inset focus:ring-muted-foreground dark:border-gray-500 dark:bg-gray-800 focus:dark:bg-transparent sm:text-sm"
          >
            <SelectValue placeholder="Select a domain" />
          </SelectTrigger>
          <SelectContent className="flex w-full rounded-md border border-input bg-white text-foreground placeholder-muted-foreground focus:border-muted-foreground focus:outline-none focus:ring-inset focus:ring-muted-foreground dark:border-gray-500 dark:bg-gray-800 focus:dark:bg-transparent sm:text-sm">
            {domains?.map(({ slug }) => (
              <SelectItem
                key={slug}
                value={slug}
                className="hover:bg-muted hover:dark:bg-gray-700"
              >
                {slug}
              </SelectItem>
            ))}
            <SelectItem
              className="hover:bg-muted hover:dark:bg-gray-700"
              value={
                linkType === "DOCUMENT_LINK"
                  ? "add_domain"
                  : "add_dataroom_domain"
              }
            >
              Add a custom domain ✨
            </SelectItem>
          </SelectContent>
        </Select>

        {data.domain ? (
          <Input
            type="text"
            name="key"
            required
            value={data.slug || ""}
            disabled={isDisabled}
            pattern="^[a-zA-Z0-9-]+$"
            onKeyDown={(e) => {
              // Allow navigation keys, backspace, delete, etc.
              if (e.key.length === 1 && !/^[a-zA-Z0-9-]$/.test(e.key)) {
                e.preventDefault();
              }
            }}
            onInvalid={(e) => {
              const currentValue = e.currentTarget.value;
              const isBlocked = BLOCKED_PATHNAMES.includes(`/${currentValue}`);

              if (isBlocked) {
                e.currentTarget.setCustomValidity(
                  "This pathname is blocked. Please choose another one.",
                );
              } else {
                e.currentTarget.setCustomValidity(
                  "Only letters, numbers, and '-' are allowed.",
                );
              }
            }}
            autoComplete="off"
            className={cn(
              "hidden rounded-l-none focus:ring-inset",
              data.domain ? "flex" : "",
              isDisabled ? "opacity-50" : "",
            )}
            placeholder="deck"
            onChange={(e) => {
              if (isDisabled) return;

              const currentValue = e.target.value.replace(/[^a-zA-Z0-9-]/g, "");
              const isBlocked = BLOCKED_PATHNAMES.includes(`/${currentValue}`);

              if (isBlocked) {
                e.currentTarget.setCustomValidity(
                  "This pathname is blocked. Please choose another one.",
                );
              } else {
                e.currentTarget.setCustomValidity("");
              }
              setData({ ...data, slug: currentValue });
            }}
            aria-invalid="true"
          />
        ) : null}
      </div>

      {isDisabled && (
        <div
          className="mt-2 text-sm text-muted-foreground"
          onClick={() => {
            setUpgradeModalOpen(true);
          }}
        >
          Custom domain and path cannot be changed on an unsupported plan.
        </div>
      )}

      {data.domain && !isDomainVerified ? (
        <div className="mt-4 text-sm text-red-500">
          Your domain is not verified yet!{" "}
          <Link
            className="underline hover:text-red-500/80"
            href="/settings/domains"
            target="_blank"
          >
            Verify now
          </Link>
        </div>
      ) : null}

      {/* Add domain modal for custom domains */}
      <AddDomainModal
        open={isModalOpen}
        setOpen={setModalOpen}
        linkType={linkType}
      />

      {/* Upgrade plan modal when trying to use custom domains without the right plan */}
      <UpgradePlanModal
        clickedPlan={
          linkType === "DATAROOM_LINK" ? PlanEnum.DataRooms : PlanEnum.Business
        }
        open={isUpgradeModalOpen}
        setOpen={setUpgradeModalOpen}
        trigger={
          linkType === "DATAROOM_LINK"
            ? "select_custom_domain_dataroom"
            : "select_custom_domain_document"
        }
        highlightItem={["custom-domain"]}
      />
    </>
  );
}
