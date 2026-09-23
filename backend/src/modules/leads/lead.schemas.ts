import { LeadStatus } from '@prisma/client';
import { z } from 'zod';

const statusEnum = z.enum(LeadStatus);

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: statusEnum.optional(),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((s) => s || undefined),
  sort: z.enum(['createdAt', 'updatedAt', 'fullName']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const leadIdParamsSchema = z.object({ id: z.uuid({ message: 'id must be a UUID' }) });

export const updateStatusBodySchema = z.object({
  status: statusEnum,
  note: z.string().trim().max(500).optional(),
  expectedVersion: z.number().int().positive().optional(),
});

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type UpdateStatusBody = z.infer<typeof updateStatusBodySchema>;
