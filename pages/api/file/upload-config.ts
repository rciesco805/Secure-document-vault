import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const uploadTransport = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT || "vercel";
  
  res.status(200).json({
    transport: uploadTransport,
  });
}
