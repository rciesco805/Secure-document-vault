import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KDF_ITERATIONS = 100000;
const HEADER_VERSION = 0x01;

export interface EncryptionResult {
  encrypted: Buffer;
  iv: Buffer;
  authTag: Buffer;
  salt?: Buffer;
}

export interface DecryptionInput {
  encrypted: Buffer;
  iv: Buffer;
  authTag: Buffer;
  salt?: Buffer;
}

export class CryptoService {
  private readonly masterKey: Buffer;
  private readonly useDerivedKeys: boolean;

  constructor(encryptionKey?: string) {
    const keySource = encryptionKey || 
      process.env.STORAGE_ENCRYPTION_KEY || 
      process.env.NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY;
    
    if (!keySource) {
      throw new Error("Encryption key is required. Set STORAGE_ENCRYPTION_KEY or NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY");
    }

    const hexBuffer = Buffer.from(keySource, "hex");
    if (hexBuffer.length === 32 && /^[0-9a-fA-F]{64}$/.test(keySource)) {
      this.masterKey = hexBuffer;
      this.useDerivedKeys = false;
    } else {
      const stableDerivationSalt = crypto.createHash("sha256").update("bf-fund-master-key-derivation").digest();
      this.masterKey = this.deriveKey(keySource, stableDerivationSalt);
      this.useDerivedKeys = true;
      console.warn(
        "CryptoService: Using password-based key derivation. For production, provide a 64-character hex key (32 bytes) via STORAGE_ENCRYPTION_KEY."
      );
    }
  }

  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, KDF_ITERATIONS, 32, "sha256");
  }

  private deriveObjectKey(salt: Buffer): Buffer {
    if (!this.useDerivedKeys) {
      return this.masterKey;
    }
    const derived = crypto.hkdfSync("sha256", this.masterKey, salt, "bf-fund-storage", 32);
    return Buffer.from(derived);
  }

  encrypt(data: Buffer): EncryptionResult {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = this.useDerivedKeys ? crypto.randomBytes(SALT_LENGTH) : undefined;
    const key = salt ? this.deriveObjectKey(salt) : this.masterKey;
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return { encrypted, iv, authTag, salt };
  }

  decrypt(input: DecryptionInput): Buffer {
    const key = input.salt ? this.deriveObjectKey(input.salt) : this.masterKey;
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, input.iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(input.authTag);

    return Buffer.concat([decipher.update(input.encrypted), decipher.final()]);
  }

  encryptToBuffer(data: Buffer): Buffer {
    const { encrypted, iv, authTag, salt } = this.encrypt(data);
    
    if (salt) {
      return Buffer.concat([
        Buffer.from([HEADER_VERSION]),
        salt,
        iv,
        authTag,
        encrypted,
      ]);
    }
    
    return Buffer.concat([
      Buffer.from([0x00]),
      iv,
      authTag,
      encrypted,
    ]);
  }

  decryptFromBuffer(encryptedData: Buffer): Buffer {
    if (encryptedData.length < 1) {
      throw new Error("Invalid encrypted data: empty");
    }

    const version = encryptedData[0];
    
    if (version === HEADER_VERSION) {
      const minLength = 1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;
      if (encryptedData.length < minLength) {
        throw new Error("Invalid encrypted data: too short for v1 format");
      }
      
      const salt = encryptedData.subarray(1, 1 + SALT_LENGTH);
      const iv = encryptedData.subarray(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
      const authTag = encryptedData.subarray(
        1 + SALT_LENGTH + IV_LENGTH,
        1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
      );
      const encrypted = encryptedData.subarray(1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
      
      return this.decrypt({ encrypted, iv, authTag, salt });
    }
    
    if (version === 0x00) {
      const minLength = 1 + IV_LENGTH + AUTH_TAG_LENGTH;
      if (encryptedData.length < minLength) {
        throw new Error("Invalid encrypted data: too short for v0 format");
      }
      
      const iv = encryptedData.subarray(1, 1 + IV_LENGTH);
      const authTag = encryptedData.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = encryptedData.subarray(1 + IV_LENGTH + AUTH_TAG_LENGTH);
      
      return this.decrypt({ encrypted, iv, authTag });
    }
    
    const minLength = IV_LENGTH + AUTH_TAG_LENGTH;
    if (encryptedData.length < minLength) {
      throw new Error("Invalid encrypted data: too short");
    }
    
    const iv = encryptedData.subarray(0, IV_LENGTH);
    const authTag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    return this.decrypt({ encrypted, iv, authTag });
  }

  hash(data: Buffer | string): string {
    const buffer = typeof data === "string" ? Buffer.from(data) : data;
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  verifyHash(data: Buffer | string, expectedHash: string): boolean {
    return this.hash(data) === expectedHash;
  }

  generateRandomKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }
}

let cachedCryptoService: CryptoService | null = null;

export function getCryptoService(): CryptoService {
  if (!cachedCryptoService) {
    cachedCryptoService = new CryptoService();
  }
  return cachedCryptoService;
}

export function resetCryptoService(): void {
  cachedCryptoService = null;
}
