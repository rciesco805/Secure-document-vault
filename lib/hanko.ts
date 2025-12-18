import { tenant } from "@teamhanko/passkeys-next-auth-provider";

let hanko: ReturnType<typeof tenant> | null = null;

if (process.env.HANKO_API_KEY && process.env.NEXT_PUBLIC_HANKO_TENANT_ID) {
  hanko = tenant({
    apiKey: process.env.HANKO_API_KEY,
    tenantId: process.env.NEXT_PUBLIC_HANKO_TENANT_ID,
  });
}

export default hanko;
