import type { Lead, LeadActivity, Prisma } from '@prisma/client';
import { conflict, notFound, unprocessable } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { recordActivity } from '../activities/activity.recorder.js';
import type { ListLeadsQuery, UpdateStatusBody } from './lead.schemas.js';
import { allowedTransitions, canTransition } from './lead.status.js';

const listSelect = {
  id: true,
  source: true,
  externalId: true,
  fullName: true,
  email: true,
  phone: true,
  campaignId: true,
  formId: true,
  status: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LeadSelect;

export async function listLeads(q: ListLeadsQuery) {
  const where: Prisma.LeadWhereInput = {
    ...(q.status && { status: q.status }),
    ...(q.search && {
      OR: [
        { fullName: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search } },
        { externalId: q.search },
      ],
    }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      select: listSelect,
      orderBy: [{ [q.sort]: q.order }, { id: 'asc' }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    data,
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
  };
}

export type LeadDetail = Lead & { activities: LeadActivity[]; allowedTransitions: readonly Lead['status'][] };

export async function getLead(id: string): Promise<LeadDetail> {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { activities: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] } },
  });
  if (!lead) throw notFound('Lead');
  return { ...lead, allowedTransitions: allowedTransitions(lead.status) };
}

export async function updateLeadStatus(id: string, body: UpdateStatusBody, actor: string): Promise<LeadDetail> {
  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id } });
    if (!lead) throw notFound('Lead');

    if (body.expectedVersion !== undefined && body.expectedVersion !== lead.version) {
      throw conflict('Lead was modified by someone else — reload and try again', {
        expectedVersion: body.expectedVersion,
        currentVersion: lead.version,
      });
    }

    if (lead.status === body.status) return;

    if (!canTransition(lead.status, body.status)) {
      throw unprocessable('INVALID_STATUS_TRANSITION', `Cannot move a lead from ${lead.status} to ${body.status}`, {
        from: lead.status,
        to: body.status,
        allowed: allowedTransitions(lead.status),
      });
    }

    const { count } = await tx.lead.updateMany({
      where: { id, version: lead.version },
      data: { status: body.status, version: { increment: 1 } },
    });
    if (count === 0) throw conflict('Lead was modified concurrently — reload and try again');

    await recordActivity(tx, {
      leadId: id,
      type: 'STATUS_CHANGED',
      actor,
      changes: { status: { from: lead.status, to: body.status } },
      metadata: body.note ? { note: body.note } : undefined,
    });
  });

  return getLead(id);
}
