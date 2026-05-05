import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../registry.js';

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
});
