import { NextApiRequest, NextApiResponse } from "next";

import { handleRoute } from "@/ee/features/billing/cancellation/api/cancel-route";


export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  return handleRoute(req, res);
}
