import type { Lead } from '@prisma/client';
import type { FieldChanges } from '../activities/activity.recorder.js';
import type { NormalizedLead } from './lead.types.js';

/** Fields an ingestion is allowed to overwrite. Status is deliberately not one of them. */
export const INGESTIBLE_FIELDS = [
  'fullName',
  'email',
  'phone',
  'pageId',
  'formId',
  'adId',
  'adsetId',
  'campaignId',
  'customFields',
  'submittedAt',
] as const satisfies readonly (keyof NormalizedLead & keyof Lead)[];

function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sorted = Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`);
    return `{${sorted.join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * Field-level diff between a stored lead and an incoming delivery.
 * Fields the delivery doesn't carry (undefined) are left alone, so a sparse
 * redelivery never blanks out data we already have.
 */
export function diffLead(existing: Lead, incoming: NormalizedLead): FieldChanges {
  const changes: FieldChanges = {};
  for (const field of INGESTIBLE_FIELDS) {
    const next = incoming[field];
    if (next === undefined) continue;
    if (field === 'customFields' && Object.keys(next as object).length === 0) continue;

    const prev = existing[field];
    if (canonical(prev) !== canonical(next)) {
      changes[field] = {
        from: prev instanceof Date ? prev.toISOString() : prev,
        to: next instanceof Date ? next.toISOString() : next,
      };
    }
  }
  return changes;
}
