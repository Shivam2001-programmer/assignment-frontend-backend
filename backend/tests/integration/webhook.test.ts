import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { app, metaPayload, sendWebhook } from '../helpers.js';

describe('POST /webhook/meta-lead', () => {
  it('creates a lead and a LEAD_CREATED activity', async () => {
    const res = await sendWebhook(metaPayload({ extra: { city: 'Pune' } }));

    expect(res.status).toBe(200);
    expect(res.body.processed).toEqual([expect.objectContaining({ externalId: 'lg_1', outcome: 'created' })]);

    const lead = await prisma.lead.findFirstOrThrow({ include: { activities: true } });
    expect(lead).toMatchObject({
      fullName: 'Rahul Sharma',
      email: 'rahul@example.com',
      status: 'NEW',
      campaignId: 'cmp_1',
      adsetId: 'adset_1',
      customFields: { city: 'Pune' },
    });
    expect(lead.activities).toHaveLength(1);
    expect(lead.activities[0]).toMatchObject({ type: 'LEAD_CREATED', actor: 'system:meta-webhook' });

    const event = await prisma.webhookEvent.findUniqueOrThrow({ where: { id: res.body.webhookEventId } });
    expect(event.status).toBe('PROCESSED');
  });

  it('is idempotent: an identical redelivery writes nothing', async () => {
    await sendWebhook(metaPayload());
    const res = await sendWebhook(metaPayload());

    expect(res.body.processed[0].outcome).toBe('unchanged');
    expect(await prisma.lead.count()).toBe(1);
    expect(await prisma.leadActivity.count()).toBe(1);
  });

  it('records LEAD_UPDATED with a field diff when data changes', async () => {
    await sendWebhook(metaPayload());
    const res = await sendWebhook(metaPayload({ email: 'new@example.com' }));

    expect(res.body.processed[0].outcome).toBe('updated');
    const updated = await prisma.leadActivity.findFirstOrThrow({ where: { type: 'LEAD_UPDATED' } });
    expect(updated.changes).toEqual({ email: { from: 'rahul@example.com', to: 'new@example.com' } });
    expect((await prisma.lead.findFirstOrThrow()).version).toBe(2);
  });

  it('does not create duplicates under concurrent deliveries of the same lead', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => sendWebhook(metaPayload())));

    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await prisma.lead.count()).toBe(1);
    expect(await prisma.leadActivity.count({ where: { type: 'LEAD_CREATED' } })).toBe(1);
  });

  it('rejects an invalid signature with 401 and stores nothing', async () => {
    const res = await sendWebhook(metaPayload(), 'wrong-secret');

    expect(res.status).toBe(401);
    expect(await prisma.webhookEvent.count()).toBe(0);
    expect(await prisma.lead.count()).toBe(0);
  });

  it('rejects a missing signature with 401', async () => {
    const res = await request(app).post('/webhook/meta-lead').send(metaPayload());
    expect(res.status).toBe(401);
  });

  it('answers 400 for a signed but malformed payload and marks the event FAILED', async () => {
    const res = await sendWebhook({ object: 'page', entry: [{ id: 'p', changes: [{ field: 'leadgen', value: {} }] }] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PAYLOAD');
    expect((await prisma.webhookEvent.findFirstOrThrow()).status).toBe('FAILED');
  });

  it('skips non-leadgen changes', async () => {
    const res = await sendWebhook({ object: 'page', entry: [{ id: 'p', changes: [{ field: 'feed', value: {} }] }] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ processed: [], skipped: 1 });
  });
});

describe('GET /webhook/meta-lead (subscription handshake)', () => {
  it('echoes hub.challenge for the right verify token', async () => {
    const res = await request(app)
      .get('/webhook/meta-lead')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'test-verify-token', 'hub.challenge': '42' });
    expect(res.status).toBe(200);
    expect(res.text).toBe('42');
  });

  it('refuses a wrong verify token', async () => {
    const res = await request(app)
      .get('/webhook/meta-lead')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'nope', 'hub.challenge': '42' });
    expect(res.status).toBe(403);
  });
});
