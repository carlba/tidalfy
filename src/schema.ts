import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .string()
      .trim()
      .default('development')
      .pipe(z.enum(['production', 'development', 'test'])),
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().int().positive().default(3000),
    DISCOGS_USER_TOKEN: z.string().optional(),
  })
  .transform(raw => ({
    NODE_ENV: raw.NODE_ENV,
    isDevelopment: raw.NODE_ENV !== 'production',
    DATABASE_URL: raw.DATABASE_URL,
    PORT: raw.PORT,
    DISCOGS_USER_TOKEN: raw.DISCOGS_USER_TOKEN,
  }));

export type Config = z.infer<typeof envSchema>;
