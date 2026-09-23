import type { LeadStatus } from '@prisma/client';


export const STATUS_TRANSITIONS: Readonly<Record<LeadStatus, readonly LeadStatus[]>> = {
  NEW: ['CONTACTED', 'QUALIFIED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['CONVERTED', 'LOST'],
  CONVERTED: [],
  LOST: ['NEW'],
};

export const allowedTransitions = (from: LeadStatus) => STATUS_TRANSITIONS[from];

export const canTransition = (from: LeadStatus, to: LeadStatus) => STATUS_TRANSITIONS[from].includes(to);
