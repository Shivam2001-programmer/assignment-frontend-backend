import { Prisma } from '@prisma/client';
import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ZodError } from 'zod';
import { env } from '../../config/env.js';
import { AppError, unauthorized } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { verifyMetaSignature } from './meta.signature.js';
import { metaWebhookSchema } from './meta.schema.js';
import { processMetaDelivery } from './meta.service.js';

export const metaWebhookRouter = Router();

const PATH = '/webhook/meta-lead';

/** Meta's subscription handshake: echo hub.challenge when the verify token matches. */
metaWebhookRouter.get(PATH, (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN && typeof challenge === 'string') {
    res.type('text/plain').send(challenge);
    return;
  }
  throw new AppError(403, 'VERIFICATION_FAILED', 'Webhook verification failed');
});

metaWebhookRouter.post(
  PATH,
  rateLimit({ windowMs: 60_000, limit: env.WEBHOOK_RATE_LIMIT_PER_MIN, standardHeaders: 'draft-8', legacyHeaders: false }),
  // Raw bytes are required for signature verification, so this route parses its own body.
  express.raw({ type: '*/*', limit: '1mb' }),
  async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

    // Unsigned requests are rejected before touching the database.
    if (!verifyMetaSignature(raw, req.get('x-hub-signature-256'), env.META_APP_SECRET)) {
      throw unauthorized('Invalid or missing X-Hub-Signature-256');
    }

    let json: unknown;
    try {
      json = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'Malformed JSON body');
    }

    const event = await prisma.webhookEvent.create({
      data: { provider: 'meta', payload: json as Prisma.InputJsonValue },
    });

    try {
      const result = await processMetaDelivery(metaWebhookSchema.parse(json), event.id);
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      req.log.info({ webhookEventId: event.id, ...summarise(result.processed), skipped: result.skipped }, 'meta delivery processed');
      res.status(200).json({ received: true, webhookEventId: event.id, ...result });
    } catch (err) {
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'FAILED', error: err instanceof Error ? err.message.slice(0, 2000) : String(err) },
      });
      // Schema errors are permanent (4xx, no point in Meta retrying); anything else is 5xx so Meta redelivers.
      if (err instanceof ZodError) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Payload does not match the Meta leadgen format', err.issues);
      }
      throw err;
    }
  },
);

function summarise(processed: { outcome: string }[]) {
  const counts: Record<string, number> = {};
  for (const p of processed) counts[p.outcome] = (counts[p.outcome] ?? 0) + 1;
  return counts;
}
