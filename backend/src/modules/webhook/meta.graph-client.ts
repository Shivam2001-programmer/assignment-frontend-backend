import { env } from '../../config/env.js';
import { type FieldDatum, fieldDatumSchema, leadgenValueSchema } from './meta.schema.js';
import { z } from 'zod';

const graphLeadSchema = z.object({
  created_time: z.string().optional(),
  ad_id: z.string().optional(),
  adset_id: z.string().optional(),
  campaign_id: z.string().optional(),
  form_id: z.string().optional(),
  field_data: z.array(fieldDatumSchema).default([]),
});

export interface LeadDetails {
  fieldData: FieldDatum[];
  overrides: Partial<z.infer<typeof leadgenValueSchema>>;
}

/**
 * Real Meta webhooks carry only ids; the answers live behind the Graph API.
 * Returns null when no page access token is configured (demo / local mode).
 */
export async function fetchLeadDetails(leadgenId: string): Promise<LeadDetails | null> {
  if (!env.META_PAGE_ACCESS_TOKEN) return null;

  const url = new URL(`https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${encodeURIComponent(leadgenId)}`);
  url.searchParams.set('fields', 'created_time,ad_id,adset_id,campaign_id,form_id,field_data');
  url.searchParams.set('access_token', env.META_PAGE_ACCESS_TOKEN);

  const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) {
    // Thrown so the delivery is answered with 5xx and Meta retries it later.
    throw new Error(`Graph API lead fetch failed with HTTP ${res.status}`);
  }

  const lead = graphLeadSchema.parse(await res.json());
  return {
    fieldData: lead.field_data,
    overrides: {
      created_time: lead.created_time,
      ad_id: lead.ad_id,
      adgroup_id: lead.adset_id,
      campaign_id: lead.campaign_id,
      form_id: lead.form_id,
    },
  };
}
