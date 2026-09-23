import { describe, expect, it } from 'vitest';
import { signMetaPayload, verifyMetaSignature } from '../../src/modules/webhook/meta.signature.js';

const secret = 'shh';
const body = Buffer.from('{"object":"page"}');

describe('verifyMetaSignature', () => {
  it('accepts a correct signature', () => {
    expect(verifyMetaSignature(body, signMetaPayload(body, secret), secret)).toBe(true);
  });

  it('rejects a signature made with another secret', () => {
    expect(verifyMetaSignature(body, signMetaPayload(body, 'other'), secret)).toBe(false);
  });

  it('rejects when the body was altered after signing', () => {
    const sig = signMetaPayload(body, secret);
    expect(verifyMetaSignature(Buffer.from('{"object":"page" }'), sig, secret)).toBe(false);
  });

  it.each([undefined, '', 'sha1=abc', 'sha256=', 'sha256=zz', 'sha256=abcd'])('rejects malformed header %s', (h) => {
    expect(verifyMetaSignature(body, h, secret)).toBe(false);
  });
});
