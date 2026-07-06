import { describe, expect, it } from 'vitest';
import { normalizeSearchResponse } from './normalize-response.js';

describe('normalizeSearchResponse', () => {
  it('selects a semantic match and excludes it from alternatives', () => {
    const result = normalizeSearchResponse(
      {
        rephrased_query: 'What causes pale tips on wheat leaves?',
        crop: 'Wheat',
        state: 'Uttar Pradesh',
        exact_match: {},
        selected_match: {
          question_id: 'selected-id',
          similarity_score: 0.9107769727706909,
          retrieval_source: 'rag',
          question: 'The tips of wheat leaves are turning yellow. What should I do?',
          answer: 'Selected guidance',
          details: [
            {
              source_name: 'Agronomy source',
              source_link: 'https://example.com/source',
              author_name: 'Expert',
            },
          ],
          gemma_class: 'SAME_INTENT',
          chosen_for_answer: true,
        },
        classification_audit: {
          status: 'selected',
          evaluations: [
            {
              question_id: 'selected-id',
              similarity_score: 0.91,
              retrieved_question: 'Selected question',
            },
            {
              question_id: 'alternative-id',
              similarity_score: 0.88,
              retrieved_question: 'Alternative question',
              relevance_decision: 'KEEP',
              relevance_reason: 'Related symptom',
            },
          ],
          selection_rule: 'same_question_relevance_bypass',
        },
      },
      1250,
    );

    expect(result.matchType).toBe('semantic');
    expect(result.selectedMatch?.questionId).toBe('selected-id');
    expect(result.selectedMatch?.sources).toHaveLength(1);
    expect(result.relatedMatches).toEqual([
      expect.objectContaining({
        questionId: 'alternative-id',
        similarityScore: 0.88,
      }),
    ]);
    expect(result.responseTimeMs).toBe(1250);
  });

  it('prioritizes an exact match over a semantic match', () => {
    const result = normalizeSearchResponse(
      {
        exact_match: {
          question_id: 'exact-id',
          question: 'Exact question',
          answer: 'Exact answer',
        },
        selected_match: {
          question_id: 'semantic-id',
          question: 'Semantic question',
          answer: 'Semantic answer',
        },
      },
      10,
    );

    expect(result.matchType).toBe('exact');
    expect(result.selectedMatch?.questionId).toBe('exact-id');
    expect(result.selectedMatch?.retrievalSource).toBe('exact');
  });

  it('handles a response without a selected result', () => {
    const result = normalizeSearchResponse(
      { exact_match: {}, selected_match: {} },
      20,
    );

    expect(result.matchType).toBe('none');
    expect(result.selectedMatch).toBeNull();
    expect(result.relatedMatches).toEqual([]);
  });

  it('uses the original query returned by the v2 API', () => {
    const result = normalizeSearchResponse(
      {
        original_query: 'What causes pale tips on wheat leaves?',
        refined_query: 'what causes pale tips on leaves?',
        removed_entities: ['wheat', 'Uttar Pradesh'],
        exact_match: {},
        selected_match: {},
      },
      30,
    );

    expect(result.query).toBe('What causes pale tips on wheat leaves?');
  });
});
