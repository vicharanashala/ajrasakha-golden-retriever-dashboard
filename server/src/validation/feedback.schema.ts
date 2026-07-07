import { z } from 'zod';

const feedbackText = (maxLength: number) =>
  z
    .string({ error: 'Value must be a string.' })
    .trim()
    .max(maxLength, `Value must contain at most ${maxLength} characters.`);

export const feedbackRequestSchema = z.object({
  tester_name: feedbackText(120).min(2, 'Tester name is required.'),
  input_question: feedbackText(1_000).min(3, 'Input question is required.'),
  state: feedbackText(120).min(2, 'State is required.'),
  crop: feedbackText(120).min(2, 'Crop is required.'),
  retrieved_question_api_v1: feedbackText(4_000),
  retrieved_question_api_v2: feedbackText(4_000),
  retrieved_answer_with_sources_v1: feedbackText(30_000),
  retrieved_answer_with_sources_v2: feedbackText(30_000),
  question_id_v1: feedbackText(300),
  question_id_v2: feedbackText(300),
  similarity_score: feedbackText(300),
  retrieval_source: feedbackText(500),
  all_other_fetched_questions_v1: feedbackText(20_000),
  all_other_fetched_questions_v2: feedbackText(20_000),
  issue_faced: feedbackText(3_000).min(3, 'Issue description is required.'),
});

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
