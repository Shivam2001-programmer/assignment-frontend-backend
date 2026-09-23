import type { CustomFields, NormalizedLead } from '../leads/lead.types.js';
import type { FieldDatum, LeadgenValue } from './meta.schema.js';

// Meta's standard lead-form question keys that map to first-class columns.
const KNOWN_FIELDS = new Set(['full_name', 'first_name', 'last_name', 'email', 'phone_number']);

export function parseCreatedTime(value: LeadgenValue['created_time']): Date | undefined {
  if (value === undefined) return undefined;
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function first(fields: Map<string, string[]>, name: string): string | undefined {
  const v = fields.get(name)?.[0]?.trim();
  return v ? v : undefined;
}

export function mapFieldData(fieldData: FieldDatum[]) {
  const fields = new Map(fieldData.map((f) => [f.name.toLowerCase(), f.values]));

  const fullName =
    first(fields, 'full_name') ??
    ([first(fields, 'first_name'), first(fields, 'last_name')].filter(Boolean).join(' ') || undefined);

  const customFields: CustomFields = {};
  for (const [name, values] of fields) {
    if (KNOWN_FIELDS.has(name)) continue;
    customFields[name] = values.length === 1 ? values[0]! : values;
  }

  return {
    fullName,
    email: first(fields, 'email')?.toLowerCase(),
    phone: first(fields, 'phone_number')?.replace(/[^\d+]/g, ''),
    customFields,
  };
}

export function toNormalizedLead(value: LeadgenValue, fieldData: FieldDatum[] = []): NormalizedLead {
  return {
    source: 'meta',
    externalId: value.leadgen_id,
    pageId: value.page_id,
    formId: value.form_id,
    adId: value.ad_id,
    adsetId: value.adgroup_id,
    campaignId: value.campaign_id,
    submittedAt: parseCreatedTime(value.created_time),
    ...mapFieldData(fieldData),
  };
}
