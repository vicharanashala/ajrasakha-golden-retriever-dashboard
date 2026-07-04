import { z } from 'zod';

export const searchRequestSchema = z.object({
  rephrased_query: z
    .string({ error: 'Question is required.' })
    .trim()
    .min(3, 'Question must contain at least 3 characters.')
    .max(1_000, 'Question must contain at most 1,000 characters.'),
  crop: z
    .string({ error: 'Crop is required.' })
    .trim()
    .min(2, 'Crop is required.')
    .max(100),
  state: z
    .string({ error: 'State is required.' })
    .trim()
    .min(2, 'State is required.')
    .max(100),
});
