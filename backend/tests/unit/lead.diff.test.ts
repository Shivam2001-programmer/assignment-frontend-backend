import type { Lead } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { diffLead } from '../../src/modules/leads/lead.diff.js';
import type { NormalizedLead } from '../../src/modules/leads/lead.types.js';

const stored: Lead = {
  id: 'x',
  source: 'meta',
  externalId: 'lg',
  fullName: 'Asha',
  email: 'a@x.com',
  phone: null,
  pageId: null,
  formId: 'f',
  adId: null,
  adsetId: null,
  campaignId: null,
  customFields: { city: 'Pune', size: '10' },
  status: 'NEW',
  version: 1,
  submittedAt: new Date('2024-01-01T00:00:00Z'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const incoming = (o: Partial<NormalizedLead>): NormalizedLead => ({
  source: 'meta',
  externalId: 'lg',
  customFields: {},
  ...o,
});

describe('diffLead', () => {
  it('returns no changes for identical data (key order in JSON ignored)', () => {
    const d = diffLead(stored, incoming({ fullName: 'Asha', customFields: { size: '10', city: 'Pune' } }));
    expect(d).toEqual({});
  });

  it('reports changed fields with from/to', () => {
    expect(diffLead(stored, incoming({ email: 'b@x.com', phone: '+91' }))).toEqual({
      email: { from: 'a@x.com', to: 'b@x.com' },
      phone: { from: null, to: '+91' },
    });
  });

  it('ignores fields the delivery does not carry', () => {
    expect(diffLead(stored, incoming({}))).toEqual({});
  });

  it('compares dates by instant', () => {
    expect(diffLead(stored, incoming({ submittedAt: new Date('2024-01-01T00:00:00.000Z') }))).toEqual({});
  });
});
