import request from 'supertest';
import { createApp } from '../src/app.js';
import { signMetaPayload } from '../src/modules/webhook/meta.signature.js';

export const app = createApp();

interface LeadOverrides {
  leadgenId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  extra?: Record<string, string>;
}

export function metaPayload(o: LeadOverrides = {}) {
  const fieldData = [
    { name: 'full_name', values: [o.fullName ?? 'Rahul Sharma'] },
    { name: 'email', values: [o.email ?? 'rahul@example.com'] },
    { name: 'phone_number', values: [o.phone ?? '+919999999999'] },
    ...Object.entries(o.extra ?? {}).map(([name, v]) => ({ name, values: [v] })),
  ];
  return {
    object: 'page',
    entry: [
      {
        id: 'page_1',
        time: 1727000000,
        changes: [
          {
            field: 'leadgen',
            value: {
              leadgen_id: o.leadgenId ?? 'lg_1',
              form_id: 'form_1',
              ad_id: 'ad_1',
              adgroup_id: 'adset_1',
              campaign_id: 'cmp_1',
              created_time: 1727000000,
              field_data: fieldData,
            },
          },
        ],
      },
    ],
  };
}

export function sendWebhook(payload: unknown, secret = 'test-app-secret') {
  const body = JSON.stringify(payload);
  return request(app)
    .post('/webhook/meta-lead')
    .set('Content-Type', 'application/json')
    .set('X-Hub-Signature-256', signMetaPayload(body, secret))
    .send(body);
}

export async function createLead(o: LeadOverrides = {}): Promise<string> {
  const res = await sendWebhook(metaPayload(o));
  if (res.status !== 200) throw new Error(`webhook failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.processed[0].leadId;
}
