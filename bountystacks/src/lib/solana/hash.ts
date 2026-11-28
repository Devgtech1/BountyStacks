const encoder = new TextEncoder();

/**
 * The exact payload hashed on-chain as the bounty requirements hash.
 * The server recomputes this with Node's crypto, so the key order matters.
 */
export function requirementsMessage(description: string, criteria: string[]): string {
  return JSON.stringify({ description, acceptanceCriteria: criteria });
}

export async function sha256Bytes(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return new Uint8Array(digest);
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = await sha256Bytes(value);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
