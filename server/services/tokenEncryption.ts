import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_SIZE = 32; // 256 bits
const IV_SIZE = 16; // 128 bits
const AUTH_TAG_SIZE = 16; // 128 bits

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.ENCRYPTION_KEY;

  if (!keyEnv) {
    throw new Error(
      "ENCRYPTION_KEY not set. Set to a 32-byte hex or base64 string."
    );
  }

  let key: Buffer;

  // Try hex first, then base64
  if (/^[0-9a-f]{64}$/i.test(keyEnv)) {
    key = Buffer.from(keyEnv, "hex");
  } else {
    try {
      key = Buffer.from(keyEnv, "base64");
    } catch {
      throw new Error("ENCRYPTION_KEY must be valid hex or base64");
    }
  }

  if (key.length !== KEY_SIZE) {
    throw new Error(`ENCRYPTION_KEY must be exactly ${KEY_SIZE} bytes`);
  }

  return key;
}

export interface EncryptedToken {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
}

export function encryptToken(plaintext: string): EncryptedToken {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_SIZE);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.from(ciphertext, "hex").toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptToken(encrypted: EncryptedToken): string {
  const key = getEncryptionKey();

  const iv = Buffer.from(encrypted.iv, "base64");
  const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
  const authTag = Buffer.from(encrypted.authTag, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}

// For storage: concatenate IV + authTag + ciphertext as single base64 string
export function encryptAndSerialize(plaintext: string): string {
  const encrypted = encryptToken(plaintext);
  const combined = Buffer.concat([
    Buffer.from(encrypted.iv, "base64"),
    Buffer.from(encrypted.authTag, "base64"),
    Buffer.from(encrypted.ciphertext, "base64"),
  ]);
  return combined.toString("base64");
}

export function deserializeAndDecrypt(serialized: string): string {
  const combined = Buffer.from(serialized, "base64");

  const iv = combined.subarray(0, IV_SIZE).toString("base64");
  const authTag = combined
    .subarray(IV_SIZE, IV_SIZE + AUTH_TAG_SIZE)
    .toString("base64");
  const ciphertext = combined.subarray(IV_SIZE + AUTH_TAG_SIZE).toString("base64");

  return decryptToken({ iv, authTag, ciphertext });
}
