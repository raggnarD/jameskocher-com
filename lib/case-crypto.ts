import { asset } from '@/lib/asset';

/**
 * Decrypts a case-study deck in the browser.
 *
 * File layout of deck.enc (written by scripts/encrypt.mjs in the private case-studies
 * repo, which must stay in step with the constants here):
 *   "JKCS1" | 16-byte salt | 12-byte IV | AES-256-GCM ciphertext + tag
 * The key is PBKDF2-HMAC-SHA256(passphrase, salt, ITERATIONS).
 *
 * The passphrase never ships: only the ciphertext is public. Anyone can download
 * that and guess offline, so the protection is exactly as strong as the passphrase.
 */
const MAGIC = 'JKCS1';
const SALT_BYTES = 16;
const IV_BYTES = 12;
const ITERATIONS = 600_000;

const storageKey = (slug: string) => `case-study-key:${slug}`;

export function deckPath(slug: string): string {
  return asset(`/case-study/${slug}/`);
}

async function fetchDeck(slug: string): Promise<ArrayBuffer> {
  const res = await fetch(`${deckPath(slug)}deck.enc`);
  if (!res.ok) throw new Error(`deck.enc: ${res.status}`);
  const bytes = await res.arrayBuffer();
  if (new TextDecoder().decode(bytes.slice(0, MAGIC.length)) !== MAGIC) {
    throw new Error('deck.enc: unrecognised format');
  }
  return bytes;
}

async function decrypt(bytes: ArrayBuffer, key: CryptoKey): Promise<string | null> {
  const iv = bytes.slice(MAGIC.length + SALT_BYTES, MAGIC.length + SALT_BYTES + IV_BYTES);
  const data = bytes.slice(MAGIC.length + SALT_BYTES + IV_BYTES);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(plain);
  } catch {
    // GCM authentication failed: wrong key.
    return null;
  }
}

function readStoredKey(slug: string): Promise<CryptoKey> | null {
  try {
    const stored = sessionStorage.getItem(storageKey(slug));
    if (!stored) return null;
    const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  } catch {
    return null;
  }
}

/** Whether this tab has already unlocked the deck. The key may still be stale after a redeploy. */
export function hasStoredKey(slug: string): boolean {
  try {
    return sessionStorage.getItem(storageKey(slug)) !== null;
  } catch {
    return false;
  }
}

/** The deck's HTML if this tab already holds a working key, otherwise null. */
export async function openWithStoredKey(slug: string): Promise<string | null> {
  const pending = readStoredKey(slug);
  if (!pending) return null;
  const html = await decrypt(await fetchDeck(slug), await pending);
  if (html === null) {
    try {
      sessionStorage.removeItem(storageKey(slug));
    } catch {}
  }
  return html;
}

/**
 * The deck's HTML if the passphrase is right, otherwise null. On success the derived
 * key (not the passphrase) is kept for this tab so the deck page can open without asking again.
 */
export async function openWithPassphrase(slug: string, passphrase: string): Promise<string | null> {
  const bytes = await fetchDeck(slug);
  const salt = bytes.slice(MAGIC.length, MAGIC.length + SALT_BYTES);
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt'],
  );
  const html = await decrypt(bytes, key);
  if (html !== null) {
    try {
      const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
      sessionStorage.setItem(storageKey(slug), btoa(String.fromCharCode(...raw)));
    } catch {}
  }
  return html;
}
