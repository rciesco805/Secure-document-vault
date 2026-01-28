import { useEffect } from "react";

import { DEFAULT_LINK_TYPE } from ".";
import { LinkUpgradeOptions } from "./link-options";

export function ProBannerSection({
  data,
  setData,
  isAllowed,
  handleUpgradeStateChange,
}: {
  data: DEFAULT_LINK_TYPE;
  setData: React.Dispatch<React.SetStateAction<DEFAULT_LINK_TYPE>>;
  isAllowed: boolean;
  handleUpgradeStateChange: ({
    state,
    trigger,
    plan,
    highlightItem,
  }: LinkUpgradeOptions) => void;
}) {
  useEffect(() => {
    if (data.showBanner) {
      setData({ ...data, showBanner: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
