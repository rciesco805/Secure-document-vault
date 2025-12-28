import { useRouter } from "next/router";

import { useEffect } from "react";

export default function Billing() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/general");
  }, [router]);

  return null;
}
