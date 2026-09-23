import { describe, expect, it } from 'vitest';
import { mapFieldData, parseCreatedTime, toNormalizedLead } from '../../src/modules/webhook/meta.mapper.js';

describe('mapFieldData', () => {
  it('maps standard fields and normalises email and phone', () => {
    const out = mapFieldData([
      { name: 'full_name', values: ['  Asha Rao '] },
      { name: 'email', values: ['Asha@Example.COM'] },
      { name: 'phone_number', values: ['+91 98765-43210'] },
    ]);
    expect(out).toEqual({ fullName: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210', customFields: {} });
  });

  it('builds the name from first/last when full_name is absent', () => {
    expect(mapFieldData([{ name: 'first_name', values: ['Asha'] }, { name: 'last_name', values: ['Rao'] }]).fullName).toBe(
      'Asha Rao',
    );
  });

  it('keeps unknown answers as custom fields, arrays for multi-select', () => {
    const out = mapFieldData([
      { name: 'city', values: ['Pune'] },
      { name: 'Interests', values: ['desk', 'cabin'] },
    ]);
    expect(out.customFields).toEqual({ city: 'Pune', interests: ['desk', 'cabin'] });
  });

  it('leaves missing fields undefined rather than empty strings', () => {
    expect(mapFieldData([{ name: 'email', values: ['  '] }])).toMatchObject({ email: undefined, fullName: undefined });
  });
});

describe('parseCreatedTime', () => {
  it('parses unix seconds (webhook) and Graph API timestamps', () => {
    expect(parseCreatedTime(1727000000)?.toISOString()).toBe('2024-09-22T10:13:20.000Z');
    expect(parseCreatedTime('2024-09-22T10:13:20+0000')?.toISOString()).toBe('2024-09-22T10:13:20.000Z');
  });

  it('returns undefined for garbage', () => {
    expect(parseCreatedTime('not a date')).toBeUndefined();
  });
});

describe('toNormalizedLead', () => {
  it('maps Meta ids onto the normalized shape', () => {
    const lead = toNormalizedLead({ leadgen_id: '123', form_id: 'f', adgroup_id: 'as', campaign_id: 'c' });
    expect(lead).toMatchObject({ source: 'meta', externalId: '123', formId: 'f', adsetId: 'as', campaignId: 'c' });
  });
});
