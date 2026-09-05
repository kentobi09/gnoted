const KEY_STORAGE_ALIAS = 'secure_vault_webcrypto_key_v1';

export interface EncryptedPayload {
  ciphertextBase64: string;
  ivBase64: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function getOrCreateMasterKey(): Promise<CryptoKey> {
  let rawKeyBase64 = localStorage.getItem(KEY_STORAGE_ALIAS);

  if (!rawKeyBase64) {
    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exportedRaw = await window.crypto.subtle.exportKey('raw', key);
    rawKeyBase64 = bytesToBase64(new Uint8Array(exportedRaw));
    localStorage.setItem(KEY_STORAGE_ALIAS, rawKeyBase64);
    return key;
  }

  const rawBytes = base64ToBytes(rawKeyBase64);
  return await window.crypto.subtle.importKey(
    'raw',
    rawBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(plaintext: string): Promise<EncryptedPayload> {
  const masterKey = await getOrCreateMasterKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    masterKey,
    encoder.encode(plaintext)
  );

  return {
    ciphertextBase64: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    ivBase64: bytesToBase64(iv),
  };
}

export async function decryptText(payload: EncryptedPayload): Promise<string> {
  try {
    const masterKey = await getOrCreateMasterKey();
    const ciphertextBuffer = base64ToBytes(payload.ciphertextBase64);
    const iv = base64ToBytes(payload.ivBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      masterKey,
      ciphertextBuffer.buffer as ArrayBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error('Decryption failed for payload:', err);
    return '[Decryption Failed]';
  }
}
