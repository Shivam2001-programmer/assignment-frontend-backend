import { ACTORS } from '../activities/activity.recorder.js';
import { type IngestResult, ingestLead } from '../leads/lead.ingest.js';
import { fetchLeadDetails } from './meta.graph-client.js';
import { toNormalizedLead } from './meta.mapper.js';
import { type LeadgenValue, type MetaWebhookPayload, leadgenValueSchema } from './meta.schema.js';

export interface DeliveryResult {
  processed: IngestResult[];
  skipped: number;
}

const definedOnly = <T extends object>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;

async function resolveLead(value: LeadgenValue) {
  if (value.field_data) return toNormalizedLead(value, value.field_data);

  const details = await fetchLeadDetails(value.leadgen_id);
  if (!details) return toNormalizedLead(value);
  return toNormalizedLead({ ...value, ...definedOnly(details.overrides) }, details.fieldData);
}

/** One delivery can batch several entries and changes; each leadgen change is ingested independently. */
export async function processMetaDelivery(payload: MetaWebhookPayload, webhookEventId: string): Promise<DeliveryResult> {
  const processed: IngestResult[] = [];
  let skipped = 0;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'leadgen') {
        skipped++;
        continue;
      }
      const value = leadgenValueSchema.parse(change.value);
      const lead = await resolveLead({ ...value, page_id: value.page_id ?? entry.id });
      processed.push(await ingestLead(lead, { actor: ACTORS.metaWebhook, webhookEventId }));
    }
  }

  return { processed, skipped };
}
