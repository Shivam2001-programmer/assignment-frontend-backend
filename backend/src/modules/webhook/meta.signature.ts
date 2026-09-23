import { createHmac, timingSafeEqual } from 'node:crypto';

const PREFIX = 'sha256=';

/**
 * Verifies Meta's X-Hub-Signature-256 header: "sha256=" + hex(HMAC-SHA256(appSecret, rawBody)).
 * Must run against the exact raw bytes — re-serialised JSON would not match.
 */
export function verifyMetaSignature(rawBody: Buffer, header: string | undefined, appSecret: string): boolean {
  if (!header?.startsWith(PREFIX)) return false;

  const received = Buffer.from(header.slice(PREFIX.length), 'hex');
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();

  // timingSafeEqual throws on length mismatch; the length itself leaks nothing useful.
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function signMetaPayload(rawBody: string | Buffer, appSecret: string): string {
  return PREFIX + createHmac('sha256', appSecret).update(rawBody).digest('hex');
}
