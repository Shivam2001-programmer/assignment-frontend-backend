import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, createLead } from '../helpers.js';

const patchStatus = (id: string, body: object, actor = 'tester') =>
  request(app).patch(`/leads/${id}/status`).set('X-Actor', actor).send(body);

describe('GET /leads', () => {
  it('paginates newest first', async () => {
    for (let i = 1; i <= 3; i++) await createLead({ leadgenId: `lg_${i}`, fullName: `Lead ${i}`, email: `l${i}@x.com` });

    const page1 = await request(app).get('/leads').query({ limit: 2 });
    expect(page1.status).toBe(200);
    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(page1.body.data.map((l: { fullName: string }) => l.fullName)).toEqual(['Lead 3', 'Lead 2']);

    const page2 = await request(app).get('/leads').query({ limit: 2, page: 2 });
    expect(page2.body.data).toHaveLength(1);
  });

  it('filters by status and searches case-insensitively', async () => {
    const a = await createLead({ leadgenId: 'a', fullName: 'Asha Rao', email: 'asha@x.com' });
    await createLead({ leadgenId: 'b', fullName: 'Vikram Singh', email: 'vikram@x.com' });
    await patchStatus(a, { status: 'CONTACTED' });

    const byStatus = await request(app).get('/leads').query({ status: 'CONTACTED' });
    expect(byStatus.body.data.map((l: { id: string }) => l.id)).toEqual([a]);

    const bySearch = await request(app).get('/leads').query({ search: 'VIKRAM' });
    expect(bySearch.body.data).toHaveLength(1);
    expect(bySearch.body.data[0].fullName).toBe('Vikram Singh');
  });

  it('validates query params', async () => {
    const res = await request(app).get('/leads').query({ limit: 1000, status: 'NOPE' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /leads/:id', () => {
  it('returns the lead with its timeline and allowed transitions', async () => {
    const id = await createLead();
    const res = await request(app).get(`/leads/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, status: 'NEW', allowedTransitions: ['CONTACTED', 'QUALIFIED', 'LOST'] });
    expect(res.body.activities.map((a: { type: string }) => a.type)).toEqual(['LEAD_CREATED']);
  });

  it('404s for an unknown id and 400s for a non-uuid', async () => {
    expect((await request(app).get(`/leads/${randomUUID()}`)).status).toBe(404);
    expect((await request(app).get('/leads/abc')).status).toBe(400);
  });
});

describe('PATCH /leads/:id/status', () => {
  it('moves the lead and records STATUS_CHANGED with actor, diff and note', async () => {
    const id = await createLead();
    const res = await patchStatus(id, { status: 'CONTACTED', note: 'Called, interested' }, 'shivam');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'CONTACTED', version: 2, allowedTransitions: ['QUALIFIED', 'LOST'] });
    expect(res.body.activities[0]).toMatchObject({
      type: 'STATUS_CHANGED',
      actor: 'user:shivam',
      changes: { status: { from: 'NEW', to: 'CONTACTED' } },
      metadata: { note: 'Called, interested' },
    });
  });

  it('rejects transitions outside the state machine with 422', async () => {
    const id = await createLead();
    const res = await patchStatus(id, { status: 'CONVERTED' });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      details: { from: 'NEW', to: 'CONVERTED', allowed: ['CONTACTED', 'QUALIFIED', 'LOST'] },
    });
  });

  it('treats setting the current status as a no-op without an activity', async () => {
    const id = await createLead();
    const res = await patchStatus(id, { status: 'NEW' });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(1);
    expect(res.body.activities).toHaveLength(1);
  });

  it('returns 409 when expectedVersion is stale', async () => {
    const id = await createLead();
    await patchStatus(id, { status: 'CONTACTED' });
    const res = await patchStatus(id, { status: 'QUALIFIED', expectedVersion: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ expectedVersion: 1, currentVersion: 2 });
  });

  it('lets exactly one of two racing conflicting updates win', async () => {
    const id = await createLead();
    const [a, b] = await Promise.all([
      patchStatus(id, { status: 'CONTACTED', expectedVersion: 1 }),
      patchStatus(id, { status: 'LOST', expectedVersion: 1 }),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const detail = await request(app).get(`/leads/${id}`);
    expect(detail.body.activities.filter((x: { type: string }) => x.type === 'STATUS_CHANGED')).toHaveLength(1);
  });

  it('validates the body and 404s unknown leads', async () => {
    const id = await createLead();
    expect((await patchStatus(id, { status: 'DONE' })).status).toBe(400);
    expect((await patchStatus(randomUUID(), { status: 'CONTACTED' })).status).toBe(404);
  });
});
