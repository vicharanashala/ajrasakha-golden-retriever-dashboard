import { z } from 'zod';

export const answerShortenerRequestSchema = z.object({
  original_query: z
    .string({ error: 'Original query is required.' })
    .trim()
    .min(3, 'Original query must contain at least 3 characters.')
    .max(4_000, 'Original query must contain at most 4,000 characters.'),
  answer: z
    .string({ error: 'Original answer is required.' })
    .trim()
    .min(3, 'Original answer must contain at least 3 characters.')
    .max(30_000, 'Original answer must contain at most 30,000 characters.'),
  expected_character_count: z
    .number({ error: 'Expected character count must be a number.' })
    .int('Expected character count must be a whole number.')
    .positive('Expected character count must be greater than zero.')
    .max(30_000, 'Expected character count is too large.'),
});
