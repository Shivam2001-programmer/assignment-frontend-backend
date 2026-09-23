import { z } from 'zod';

const id = z.coerce.string().min(1);

export const fieldDatumSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.coerce.string()).default([]),
});

/** `value` of a change with field === "leadgen". Meta only guarantees leadgen_id. */
export const leadgenValueSchema = z.object({
  leadgen_id: id,
  page_id: id.optional(),
  form_id: id.optional(),
  ad_id: id.optional(),
  adgroup_id: id.optional(),
  campaign_id: id.optional(),
  // Unix seconds in webhooks, ISO string from the Graph API.
  created_time: z.union([z.number(), z.string()]).optional(),
  // Not sent by Meta in real webhooks (details are fetched from the Graph API),
  // but accepted so the service can be driven end-to-end without a Meta app.
  field_data: z.array(fieldDatumSchema).optional(),
});

export const metaWebhookSchema = z.object({
  object: z.literal('page'),
  entry: z
    .array(
      z.object({
        id: id,
        time: z.number().optional(),
        changes: z.array(z.object({ field: z.string(), value: z.unknown() })).default([]),
      }),
    )
    .min(1),
});

export type FieldDatum = z.infer<typeof fieldDatumSchema>;
export type LeadgenValue = z.infer<typeof leadgenValueSchema>;
export type MetaWebhookPayload = z.infer<typeof metaWebhookSchema>;
