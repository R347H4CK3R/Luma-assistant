import { serializeState, parseBackup } from "./core.js";
const FORMAT = "luma-encrypted-backup",
  ITERATIONS = 310000,
  MAX_BYTES = 3000000;
const encoder = new TextEncoder();
function cryptoAvailable() {
  if (!globalThis.crypto?.subtle)
    throw Error(
      "Secure encryption is unavailable in this app environment. No backup was created.",
    );
}
function passwordValid(password) {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 256
  )
    throw Error(
      "Use a passphrase between 12 and 256 characters. Keep it safe; there is no recovery service.",
    );
}
function encode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function decode(value) {
  if (
    typeof value !== "string" ||
    value.length > 2700000 ||
    !/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  )
    throw Error("Unsupported encrypted backup format.");
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
async function keyFor(password, salt) {
  const base = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export function isEncryptedBackup(raw) {
  try {
    return JSON.parse(raw)?.format === FORMAT;
  } catch {
    return false;
  }
}
export async function encryptBackup(state, password) {
  cryptoAvailable();
  passwordValid(password);
  const raw = serializeState(state);
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(password, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode("Luma backup v1") },
    key,
    encoder.encode(raw),
  );
  return JSON.stringify({
    format: FORMAT,
    version: 1,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: ITERATIONS,
      salt: encode(salt),
    },
    cipher: { name: "AES-GCM", iv: encode(iv) },
    data: encode(new Uint8Array(cipher)),
  });
}
export async function decryptBackup(raw, password) {
  cryptoAvailable();
  passwordValid(password);
  if (typeof raw !== "string" || encoder.encode(raw).length > MAX_BYTES)
    throw Error("Encrypted backup is too large.");
  let e;
  try {
    e = JSON.parse(raw);
  } catch {
    throw Error("Unsupported encrypted backup format.");
  }
  if (
    e?.format !== FORMAT ||
    e.version !== 1 ||
    e.kdf?.name !== "PBKDF2" ||
    e.kdf.hash !== "SHA-256" ||
    e.kdf.iterations !== ITERATIONS ||
    e.cipher?.name !== "AES-GCM"
  )
    throw Error("Unsupported encrypted backup format.");
  const salt = decode(e.kdf.salt),
    iv = decode(e.cipher.iv),
    data = decode(e.data);
  if (salt.length !== 16 || iv.length !== 12 || data.length < 16)
    throw Error("Unsupported encrypted backup format.");
  const key = await keyFor(password, salt);
  let plain;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: encoder.encode("Luma backup v1") },
      key,
      data,
    );
  } catch {
    throw Error(
      "Unable to decrypt this backup. Check the passphrase and file integrity.",
    );
  }
  return parseBackup(new TextDecoder("utf-8", { fatal: true }).decode(plain));
}
