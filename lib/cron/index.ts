import { Receiver } from "@upstash/qstash";
import { Client } from "@upstash/qstash";
import Bottleneck from "bottleneck";

// we're using Bottleneck to avoid running into Resend's rate limit of 10 req/s
export const limiter = new Bottleneck({
  maxConcurrent: 1, // maximum concurrent requests
  minTime: 100, // minimum time between requests in ms
});

// we're using Upstash's Receiver to verify the request signature
// Only initialize if the signing keys are available
export const receiver = process.env.QSTASH_CURRENT_SIGNING_KEY
  ? new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
    })
  : null;

// Only initialize QStash client if token is available
export const qstash = process.env.QSTASH_TOKEN
  ? new Client({
      token: process.env.QSTASH_TOKEN,
    })
  : null;
