import { Prisma } from '@prisma/client';
import { prisma, type TxClient } from '../../lib/prisma.js';
import { recordActivity } from '../activities/activity.recorder.js';
import { diffLead } from './lead.diff.js';
import type { IngestOutcome, NormalizedLead } from './lead.types.js';

interface IngestContext {
  actor: string;
  webhookEventId?: string;
}

export interface IngestResult {
  leadId: string;
  externalId: string;
  outcome: IngestOutcome;
}

async function upsertInTx(tx: TxClient, input: NormalizedLead, ctx: IngestContext): Promise<IngestResult> {
  const { source, externalId } = input;
  const existing = await tx.lead.findUnique({ where: { source_externalId: { source, externalId } } });
  const metadata = ctx.webhookEventId ? { webhookEventId: ctx.webhookEventId } : undefined;

  if (!existing) {
    const lead = await tx.lead.create({
      data: { ...input, customFields: input.customFields as Prisma.InputJsonValue },
    });
    await recordActivity(tx, {
      leadId: lead.id,
      type: 'LEAD_CREATED',
      actor: ctx.actor,
      metadata: { ...metadata, source, formId: input.formId, adId: input.adId, campaignId: input.campaignId },
    });
    return { leadId: lead.id, externalId, outcome: 'created' };
  }

  const changes = diffLead(existing, input);
  if (Object.keys(changes).length === 0) {
    // Exact redelivery (Meta retries aggressively) — nothing to write, nothing to audit.
    return { leadId: existing.id, externalId, outcome: 'unchanged' };
  }

  const data: Prisma.LeadUpdateInput = { version: { increment: 1 } };
  for (const field of Object.keys(changes) as (keyof NormalizedLead)[]) {
    (data as Record<string, unknown>)[field] = input[field];
  }
  await tx.lead.update({ where: { id: existing.id }, data });
  await recordActivity(tx, { leadId: existing.id, type: 'LEAD_UPDATED', actor: ctx.actor, changes, metadata });
  return { leadId: existing.id, externalId, outcome: 'updated' };
}

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

/**
 * Idempotent create-or-update keyed on (source, externalId).
 * Lead row and activity row are written in one transaction.
 *
 * Two concurrent deliveries of the same new lead can both miss the lookup; the
 * loser hits the unique constraint, its transaction rolls back, and the retry
 * takes the update path instead of creating a duplicate.
 */
export async function ingestLead(input: NormalizedLead, ctx: IngestContext): Promise<IngestResult> {
  try {
    return await prisma.$transaction((tx) => upsertInTx(tx, input, ctx));
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    return prisma.$transaction((tx) => upsertInTx(tx, input, ctx));
  }
}
