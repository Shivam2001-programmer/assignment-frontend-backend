import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma.js';

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE lead_activities, leads, webhook_events CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});
