import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { metaWebhookRouter } from './modules/webhook/meta.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      exposedHeaders: ['X-Request-Id'],
    }),
  );
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      genReqId: (req, res) => {
        const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
    }),
  );

  app.use(healthRouter);
  // Mounted before express.json(): the webhook needs the untouched raw body to verify its signature.
  app.use(metaWebhookRouter);

  app.use(express.json({ limit: '100kb' }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
