import { PrismaClient, type Prisma } from '@prisma/client';

export const prisma = new PrismaClient();

export type TxClient = Prisma.TransactionClient;
