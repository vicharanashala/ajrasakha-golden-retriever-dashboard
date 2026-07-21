import { z } from 'zod';

const feedbackText = (maxLength: number) =>
  z
    .string({ error: 'Value must be a string.' })
    .trim()
    .max(maxLength, `Value must contain at most ${maxLength} characters.`);

const count = z
  .number({ error: 'Character count must be a number.' })
  .int('Character count must be a whole number.')
  .nonnegative('Character count cannot be negative.');

export const answerShortenerFeedbackRequestSchema = z.object({
  tester_name: feedbackText(120).min(2, 'Tester name is required.'),
  original_query: feedbackText(4_000).min(3, 'Original query is required.'),
  expected_number_of_characters: count.positive(
    'Expected number of characters must be greater than zero.',
  ),
  full_answer: feedbackText(30_000),
  short_answer: feedbackText(30_000),
  original_character_count: count,
  expected_character_count: count,
  min_character_count: count,
  max_character_count: count,
  actual_character_count: count,
  footer_character_count: count,
  tolerance: count,
  issue_faced: feedbackText(3_000).min(3, 'Issue description is required.'),
});

export type AnswerShortenerFeedbackRequest = z.infer<
  typeof answerShortenerFeedbackRequestSchema
>;
