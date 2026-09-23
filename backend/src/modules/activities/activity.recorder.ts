import { type ActivityType, Prisma } from '@prisma/client';
import type { TxClient } from '../../lib/prisma.js';

export type FieldChanges = Record<string, { from: unknown; to: unknown }>;

export const ACTORS = {
  metaWebhook: 'system:meta-webhook',
  seed: 'system:seed',
} as const;

interface ActivityInput {
  leadId: string;
  type: ActivityType;
  actor: string;
  changes?: FieldChanges;
  metadata?: Record<string, unknown>;
}

/**
 * The only way activities are written. Takes a transaction client on purpose:
 * an audit row must commit or roll back together with the change it describes.
 */
export function recordActivity(tx: TxClient, input: ActivityInput) {
  return tx.leadActivity.create({
    data: {
      leadId: input.leadId,
      type: input.type,
      actor: input.actor,
      changes: (input.changes as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
    },
  });
}
