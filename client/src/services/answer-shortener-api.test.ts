import { describe, expect, it } from 'vitest';
import { normalizeAnswerShortenerResponse } from './answer-shortener-api';

describe('answer shortener response normalization', () => {
  it('maps the deployed v1 response fields for display', () => {
    expect(
      normalizeAnswerShortenerResponse({
        short_answer: 'Short answer',
        full_answer: 'Full answer',
        original_character_count: 500,
        expected_character_count: 250,
        minimum_character_count: 225,
        maximum_character_count: 275,
        actual_character_count: 246,
        tolerance: 25,
        within_tolerance: true,
        footer_character_count: 12,
      }),
    ).toEqual({
      shortAnswer: 'Short answer',
      fullAnswer: 'Full answer',
      originalCharacterCount: 500,
      expectedCharacterCount: 250,
      minimumCharacterCount: 225,
      maximumCharacterCount: 275,
      actualCharacterCount: 246,
      tolerance: 25,
      withinTolerance: true,
      footerCharacterCount: 12,
    });
  });
});
