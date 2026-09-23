import { describe, expect, it } from 'vitest';
import { STATUS_TRANSITIONS, canTransition } from '../../src/modules/leads/lead.status.js';

describe('lead status machine', () => {
  it.each([
    ['NEW', 'CONTACTED'],
    ['NEW', 'LOST'],
    ['CONTACTED', 'QUALIFIED'],
    ['QUALIFIED', 'CONVERTED'],
    ['LOST', 'NEW'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ['NEW', 'CONVERTED'],
    ['CONTACTED', 'NEW'],
    ['CONVERTED', 'LOST'],
    ['LOST', 'CONVERTED'],
  ] as const)('rejects %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it('treats CONVERTED as terminal', () => {
    expect(STATUS_TRANSITIONS.CONVERTED).toEqual([]);
  });

  it('never lists a self-transition', () => {
    for (const [from, tos] of Object.entries(STATUS_TRANSITIONS)) expect(tos).not.toContain(from);
  });
});
