import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode, TransferType, TransferNetwork, ACHClass } from 'plaid';
import crypto from 'crypto';
import { importJWK, jwtVerify } from 'jose';

function getEncryptionKey(): string {
  const key = process.env.PLAID_TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('PLAID_TOKEN_ENCRYPTION_KEY or NEXTAUTH_SECRET is required in production');
  }
  return key || 'default-key-for-dev-only';
}

export function encryptToken(token: string): string {
  const ENCRYPTION_KEY = getEncryptionKey();
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptToken(encryptedToken: string): string {
  const ENCRYPTION_KEY = getEncryptionKey();
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  
  const parts = encryptedToken.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export function isPlaidConfigured(): boolean {
  return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

export async function createLinkToken(userId: string, clientName: string = 'BF Fund'): Promise<string> {
  const response = await plaidClient.linkTokenCreate({
    user: {
      client_user_id: userId,
    },
    client_name: clientName,
    products: [Products.Auth, Products.Transfer],
    country_codes: [CountryCode.Us],
    language: 'en',
    webhook: process.env.PLAID_WEBHOOK_URL,
  });

  return response.data.link_token;
}

export async function exchangePublicToken(publicToken: string): Promise<{
  accessToken: string;
  itemId: string;
}> {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

export async function getAccounts(accessToken: string) {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  return response.data.accounts;
}

export async function getInstitution(institutionId: string) {
  const response = await plaidClient.institutionsGetById({
    institution_id: institutionId,
    country_codes: [CountryCode.Us],
  });

  return response.data.institution;
}

export async function getItem(accessToken: string) {
  const response = await plaidClient.itemGet({
    access_token: accessToken,
  });

  return response.data.item;
}

export async function getAccountBalance(accessToken: string, accountIds?: string[]) {
  const response = await plaidClient.accountsBalanceGet({
    access_token: accessToken,
    options: accountIds ? { account_ids: accountIds } : undefined,
  });

  return response.data.accounts;
}

export async function createProcessorToken(accessToken: string, accountId: string): Promise<string> {
  const response = await plaidClient.processorTokenCreate({
    access_token: accessToken,
    account_id: accountId,
    processor: 'dwolla' as any,
  });

  return response.data.processor_token;
}

export async function createTransferAuthorization(
  accessToken: string,
  accountId: string,
  amount: string,
  type: 'debit' | 'credit',
  legalName: string,
  emailAddress?: string
) {
  const response = await plaidClient.transferAuthorizationCreate({
    access_token: accessToken,
    account_id: accountId,
    type: type as TransferType,
    network: TransferNetwork.Ach,
    amount: amount,
    ach_class: ACHClass.Ppd,
    user: {
      legal_name: legalName,
      email_address: emailAddress,
    },
  });

  return {
    authorizationId: response.data.authorization.id,
    decision: response.data.authorization.decision,
    decisionRationale: response.data.authorization.decision_rationale,
  };
}

export async function createTransfer(
  accessToken: string,
  accountId: string,
  authorizationId: string,
  amount: string,
  description: string
) {
  const response = await plaidClient.transferCreate({
    access_token: accessToken,
    account_id: accountId,
    authorization_id: authorizationId,
    amount: amount,
    description: description,
  });

  return {
    transferId: response.data.transfer.id,
    status: response.data.transfer.status,
    created: response.data.transfer.created,
  };
}

export async function getTransfer(transferId: string) {
  const response = await plaidClient.transferGet({
    transfer_id: transferId,
  });

  return response.data.transfer;
}

export async function cancelTransfer(transferId: string) {
  const response = await plaidClient.transferCancel({
    transfer_id: transferId,
  });

  return response.data;
}

export async function removeItem(accessToken: string) {
  const response = await plaidClient.itemRemove({
    access_token: accessToken,
  });

  return response.data;
}

export async function verifyWebhookSignature(body: string, signedJwt: string): Promise<boolean> {
  if (!signedJwt) {
    console.error('Plaid webhook: Missing Plaid-Verification header');
    return false;
  }

  try {
    const [headerB64] = signedJwt.split('.');
    if (!headerB64) {
      console.error('Plaid webhook: Invalid JWT format');
      return false;
    }

    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    const keyId = header.kid;

    if (!keyId) {
      console.error('Plaid webhook: Missing key ID in JWT header');
      return false;
    }

    const keyResponse = await plaidClient.webhookVerificationKeyGet({
      key_id: keyId,
    });

    const jwk = keyResponse.data.key;
    const publicKey = await importJWK(jwk, 'ES256');
    
    const { payload } = await jwtVerify(signedJwt, publicKey, {
      algorithms: ['ES256'],
      maxTokenAge: '5 minutes',
    });
    
    const requestBodyHash = crypto.createHash('sha256').update(body).digest('hex');
    
    if (payload.request_body_sha256 !== requestBodyHash) {
      console.error('Plaid webhook: Body hash mismatch');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Plaid webhook verification error:', error);
    return false;
  }
}

export type PlaidWebhookType = 
  | 'ITEM'
  | 'AUTH'
  | 'TRANSFER';

export interface PlaidWebhookPayload {
  webhook_type: PlaidWebhookType;
  webhook_code: string;
  item_id?: string;
  error?: {
    error_type: string;
    error_code: string;
    error_message: string;
  };
  transfer_id?: string;
  new_transfer_status?: string;
}

export function parseWebhookEvent(payload: PlaidWebhookPayload): {
  type: PlaidWebhookType;
  code: string;
  itemId?: string;
  transferId?: string;
  newStatus?: string;
  error?: { type: string; code: string; message: string };
} {
  return {
    type: payload.webhook_type,
    code: payload.webhook_code,
    itemId: payload.item_id,
    transferId: payload.transfer_id,
    newStatus: payload.new_transfer_status,
    error: payload.error ? {
      type: payload.error.error_type,
      code: payload.error.error_code,
      message: payload.error.error_message,
    } : undefined,
  };
}
