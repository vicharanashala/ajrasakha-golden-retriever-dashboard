import type {
  AuditEvaluation,
  ClassificationAudit,
  NormalizedMatch,
  NormalizedSearchResponse,
  RelatedMatch,
  SourceDetail,
  UpstreamMatch,
  UpstreamSearchResponse,
} from '../types/retrieval.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const normalizeMatch = (
  value: unknown,
  fallbackSource: string,
): NormalizedMatch | null => {
  if (!isRecord(value) || Object.keys(value).length === 0) return null;

  const match = value as UpstreamMatch;
  const details = Array.isArray(match.details)
    ? (match.details as SourceDetail[])
    : [];

  return {
    questionId: asString(match.question_id),
    question: asString(match.question) ?? 'Retrieved question unavailable',
    answer: asString(match.answer) ?? 'No answer was returned for this match.',
    similarityScore: asNumber(match.similarity_score),
    retrievalSource: asString(match.retrieval_source) ?? fallbackSource,
    classification: asString(match.gemma_class),
    answerFromClass: asString(match.answer_from_class),
    chosenForAnswer: match.chosen_for_answer === true,
    relevanceDecision: null,
    relevanceReason: null,
    sources: details
      .filter(isRecord)
      .map((detail) => ({
        name: asString(detail.source_name) ?? 'Untitled source',
        url: asString(detail.source_link),
        author: asString(detail.author_name),
      })),
  };
};

const normalizeRelatedMatches = (
  value: unknown,
  selectedQuestionId: string | null,
): RelatedMatch[] => {
  if (!Array.isArray(value)) return [];

  return (value as AuditEvaluation[])
    .filter(isRecord)
    .filter((evaluation) => asString(evaluation.question_id) !== selectedQuestionId)
    .map((evaluation) => ({
      questionId: asString(evaluation.question_id),
      question:
        asString(evaluation.retrieved_question) ??
        'Retrieved question unavailable',
      similarityScore: asNumber(evaluation.similarity_score),
      relevanceDecision: asString(evaluation.relevance_decision),
      relevanceReason:
        asString(evaluation.relevance_reason) ?? asString(evaluation.reason),
      classification: asString(evaluation.classification),
      action: asString(evaluation.action),
    }))
    .sort(
      (left, right) =>
        (right.similarityScore ?? -1) - (left.similarityScore ?? -1),
    );
};

export const normalizeSearchResponse = (
  upstream: UpstreamSearchResponse,
  responseTimeMs: number,
): NormalizedSearchResponse => {
  const exactMatch = normalizeMatch(upstream.exact_match, 'exact');
  const semanticMatch = normalizeMatch(upstream.selected_match, 'rag');
  const baseSelectedMatch = exactMatch ?? semanticMatch;
  const audit = isRecord(upstream.classification_audit)
    ? (upstream.classification_audit as ClassificationAudit)
    : {};
  const selectedEvaluation = Array.isArray(audit.evaluations)
    ? (audit.evaluations as AuditEvaluation[]).find(
        (evaluation) =>
          isRecord(evaluation) &&
          asString(evaluation.question_id) === baseSelectedMatch?.questionId,
      )
    : undefined;
  const selectedMatch = baseSelectedMatch
    ? {
        ...baseSelectedMatch,
        relevanceDecision: asString(selectedEvaluation?.relevance_decision),
        relevanceReason:
          asString(selectedEvaluation?.relevance_reason) ??
          asString(selectedEvaluation?.reason),
      }
    : null;

  return {
    query:
      asString(upstream.original_query) ??
      asString(upstream.rephrased_query) ??
      asString(upstream.refined_query) ??
      '',
    crop: asString(upstream.crop) ?? '',
    state: asString(upstream.state) ?? '',
    matchType: exactMatch ? 'exact' : semanticMatch ? 'semantic' : 'none',
    selectedMatch,
    relatedMatches: normalizeRelatedMatches(
      audit.evaluations,
      selectedMatch?.questionId ?? null,
    ),
    audit: {
      status: asString(audit.status),
      model: asString(audit.model),
      selectionRule: asString(audit.selection_rule),
      selectionMethod: asString(audit.selection_method),
      relevanceFilterMode: asString(audit.relevance_filter_mode),
    },
    responseTimeMs,
    rawResponse: upstream,
  };
};
