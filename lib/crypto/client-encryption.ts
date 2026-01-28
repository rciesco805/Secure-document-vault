export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  algorithm: string;
}

export interface KeyDerivationParams {
  salt: Uint8Array;
  iterations: number;
  hash: string;
}

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(
  data: string | ArrayBuffer,
  password: string
): Promise<EncryptedData> {
  const salt = generateRandomBytes(SALT_LENGTH);
  const iv = generateRandomBytes(IV_LENGTH);
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const dataBytes = typeof data === "string" ? encoder.encode(data) : new Uint8Array(data);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    dataBytes
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    algorithm: `${ALGORITHM}-${KEY_LENGTH}`,
  };
}

export async function decryptData(
  encryptedData: EncryptedData,
  password: string
): Promise<ArrayBuffer> {
  const salt = new Uint8Array(base64ToArrayBuffer(encryptedData.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv));
  const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);

  const key = await deriveKey(password, salt);

  return crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );
}

export async function decryptToString(
  encryptedData: EncryptedData,
  password: string
): Promise<string> {
  const decrypted = await decryptData(encryptedData, password);
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

export async function generateEncryptionKey(): Promise<{ key: CryptoKey; exportedKey: string }> {
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );

  const exported = await crypto.subtle.exportKey("raw", key);
  return {
    key,
    exportedKey: arrayBufferToBase64(exported),
  };
}

export async function encryptWithKey(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = generateRandomBytes(IV_LENGTH);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  };
}

export async function decryptWithKey(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const ivBytes = new Uint8Array(base64ToArrayBuffer(iv));
  const ciphertextBytes = base64ToArrayBuffer(ciphertext);

  return crypto.subtle.decrypt(
    { name: ALGORITHM, iv: ivBytes },
    key,
    ciphertextBytes
  );
}

export async function encryptSignatureData(
  signatureImage: string,
  password: string
): Promise<EncryptedData> {
  return encryptData(signatureImage, password);
}

export async function decryptSignatureData(
  encryptedSignature: EncryptedData,
  password: string
): Promise<string> {
  return decryptToString(encryptedSignature, password);
}

export function generateSecurePassword(length: number = 32): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const randomValues = generateRandomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return arrayBufferToBase64(hashBuffer);
}

export async function verifyHash(data: string, expectedHash: string): Promise<boolean> {
  const actualHash = await hashData(data);
  return actualHash === expectedHash;
}
