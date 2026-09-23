import { Router, type Request } from 'express';
import { leadIdParamsSchema, listLeadsQuerySchema, updateStatusBodySchema } from './lead.schemas.js';
import { getLead, listLeads, updateLeadStatus } from './lead.service.js';

export const leadRouter = Router();

function actorFrom(req: Request): string {
  const raw = req.get('x-actor')?.trim().slice(0, 100);
  return `user:${raw || 'anonymous'}`;
}

leadRouter.get('/leads', async (req, res) => {
  res.json(await listLeads(listLeadsQuerySchema.parse(req.query)));
});

leadRouter.get('/leads/:id', async (req, res) => {
  const { id } = leadIdParamsSchema.parse(req.params);
  res.json(await getLead(id));
});

leadRouter.patch('/leads/:id/status', async (req, res) => {
  const { id } = leadIdParamsSchema.parse(req.params);
  const body = updateStatusBodySchema.parse(req.body ?? {});
  res.json(await updateLeadStatus(id, body, actorFrom(req)));
});
