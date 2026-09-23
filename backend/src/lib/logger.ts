import { pino } from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: {
    // Never write PII or secrets to logs.
    paths: ['req.headers.authorization', 'req.headers["x-hub-signature-256"]', '*.email', '*.phone'],
    censor: '[redacted]',
  },
  ...(env.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty', options: { singleLine: true } },
  }),
});
