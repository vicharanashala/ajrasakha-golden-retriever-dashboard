import { describe, expect, it } from 'vitest';
import { createAnswerShortenerFeedbackSubmission } from './answer-shortener-feedback-api';

describe('answer shortener feedback submission', () => {
  it('maps the API result into the Google Sheet row fields', () => {
    expect(
      createAnswerShortenerFeedbackSubmission(
        'Tester',
        {
          originalQuery: 'How should I water a young plant?',
          expectedCharacters: 50,
          originalAnswer: 'Full answer',
        },
        {
          fullAnswer: 'Full answer',
          shortAnswer: 'Short answer',
          originalCharacterCount: 100,
          expectedCharacterCount: 50,
          minimumCharacterCount: 1,
          maximumCharacterCount: 100,
          actualCharacterCount: 48,
          footerCharacterCount: 0,
          tolerance: 50,
          withinTolerance: true,
        },
        'The shortened answer needs review.',
      ),
    ).toEqual(
      expect.objectContaining({
        tester_name: 'Tester',
        expected_number_of_characters: 50,
        min_character_count: 1,
        max_character_count: 100,
        issue_faced: 'The shortened answer needs review.',
      }),
    );
  });
});
