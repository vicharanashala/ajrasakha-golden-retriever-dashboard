import type {
  RelatedMatch,
  SearchResponse,
  SelectedMatch,
} from '../types';

interface SourceDetail {
  source_name?: unknown;
  source_link?: unknown;
  author_name?: unknown;
}

interface UpstreamMatch {
  question_id?: unknown;
  similarity_score?: unknown;
  combined_score?: unknown;
  retrieval_source?: unknown;
  question?: unknown;
  answer?: unknown;
  details?: unknown;
  gemma_class?: unknown;
  chosen_for_answer?: unknown;
  answer_from_class?: unknown;
}

interface AuditEvaluation {
  question_id?: unknown;
  similarity_score?: unknown;
  combined_score?: unknown;
  relevance_score?: unknown;
  retrieval_source?: unknown;
  retrieved_question?: unknown;
  relevance_decision?: unknown;
  relevance_reason?: unknown;
  classification?: unknown;
  reason?: unknown;
  action?: unknown;
  llm_parse_ok?: unknown;
}

interface ClassificationAudit {
  status?: unknown;
  model?: unknown;
  relevance_filter_mode?: unknown;
  evaluations?: unknown;
  selection_rule?: unknown;
  selection_method?: unknown;
  search_mode?: unknown;
}

interface V2Metadata {
  retrieval_sources?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const asBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const uniqueValues = new Map<string, string>();
  value.forEach((item) => {
    const normalized = asString(item);
    if (normalized) uniqueValues.set(normalized.toLowerCase(), normalized);
  });
  return [...uniqueValues.values()];
};

const mergeStringValues = (...values: unknown[]): string[] => {
  const merged = values.flatMap((value) =>
    Array.isArray(value) ? asStringArray(value) : asString(value) ?? [],
  );
  return asStringArray(merged);
};

const getMetadataSources = (
  retrievalSources: unknown,
  questionId: string | null,
): string[] => {
  if (!questionId || !isRecord(retrievalSources)) return [];
  return asStringArray(retrievalSources[questionId]);
};

const normalizeMatch = (
  value: unknown,
  fallbackSource: string,
  metadataSources: string[],
): SelectedMatch | null => {
  if (!isRecord(value) || Object.keys(value).length === 0) return null;

  const match = value as UpstreamMatch;
  const details = Array.isArray(match.details)
    ? (match.details as SourceDetail[])
    : [];
  const retrievalSources = mergeStringValues(
    metadataSources,
    match.retrieval_source,
  );

  return {
    questionId: asString(match.question_id),
    question: asString(match.question) ?? 'Retrieved question unavailable',
    answer: asString(match.answer) ?? 'No answer was returned for this match.',
    similarityScore: asNumber(match.similarity_score),
    combinedScore: asNumber(match.combined_score),
    relevanceScore: null,
    retrievalSources:
      retrievalSources.length > 0 ? retrievalSources : [fallbackSource],
    classification: asString(match.gemma_class),
    answerFromClass: asString(match.answer_from_class),
    chosenForAnswer: match.chosen_for_answer === true,
    action: null,
    llmParseOk: null,
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
  retrievalSources: unknown,
): RelatedMatch[] => {
  if (!Array.isArray(value)) return [];

  return (value as AuditEvaluation[])
    .filter(isRecord)
    .filter(
      (evaluation) => asString(evaluation.question_id) !== selectedQuestionId,
    )
    .map((evaluation) => {
      const questionId = asString(evaluation.question_id);
      const normalizedSources = mergeStringValues(
        getMetadataSources(retrievalSources, questionId),
        evaluation.retrieval_source,
      );
      return {
        questionId,
        question:
          asString(evaluation.retrieved_question) ??
          'Retrieved question unavailable',
        similarityScore: asNumber(evaluation.similarity_score),
        combinedScore: asNumber(evaluation.combined_score),
        relevanceScore: asNumber(evaluation.relevance_score),
        retrievalSources:
          normalizedSources.length > 0 ? normalizedSources : ['rag'],
        relevanceDecision: asString(evaluation.relevance_decision),
        relevanceReason:
          asString(evaluation.relevance_reason) ?? asString(evaluation.reason),
        classification: asString(evaluation.classification),
        action: asString(evaluation.action),
        llmParseOk: asBoolean(evaluation.llm_parse_ok),
      };
    })
    .sort(
      (left, right) =>
        (right.combinedScore ?? right.similarityScore ?? -1) -
        (left.combinedScore ?? left.similarityScore ?? -1),
    );
};

export const normalizeSearchResponse = (
  upstream: Record<string, unknown>,
  responseTimeMs: number,
): SearchResponse => {
  const audit = isRecord(upstream.classification_audit)
    ? (upstream.classification_audit as ClassificationAudit)
    : {};
  const metadata = isRecord(upstream.v2_metadata)
    ? (upstream.v2_metadata as V2Metadata)
    : {};
  const exactQuestionId = isRecord(upstream.exact_match)
    ? asString(upstream.exact_match.question_id)
    : null;
  const semanticQuestionId = isRecord(upstream.selected_match)
    ? asString(upstream.selected_match.question_id)
    : null;
  const exactMatch = normalizeMatch(
    upstream.exact_match,
    'exact',
    getMetadataSources(metadata.retrieval_sources, exactQuestionId),
  );
  const semanticMatch = normalizeMatch(
    upstream.selected_match,
    'rag',
    getMetadataSources(metadata.retrieval_sources, semanticQuestionId),
  );
  const baseSelectedMatch = exactMatch ?? semanticMatch;
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
        combinedScore:
          baseSelectedMatch.combinedScore ??
          asNumber(selectedEvaluation?.combined_score),
        relevanceScore: asNumber(selectedEvaluation?.relevance_score),
        retrievalSources: mergeStringValues(
          baseSelectedMatch.retrievalSources,
          selectedEvaluation?.retrieval_source,
        ),
        relevanceDecision: asString(selectedEvaluation?.relevance_decision),
        relevanceReason:
          asString(selectedEvaluation?.relevance_reason) ??
          asString(selectedEvaluation?.reason),
        action: asString(selectedEvaluation?.action),
        llmParseOk: asBoolean(selectedEvaluation?.llm_parse_ok),
      }
    : null;
  const relatedMatches = normalizeRelatedMatches(
    audit.evaluations,
    selectedMatch?.questionId ?? null,
    metadata.retrieval_sources,
  );

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
    relatedMatches,
    audit: {
      status: asString(audit.status),
      model: asString(audit.model),
      selectionRule: asString(audit.selection_rule),
      selectionMethod: asString(audit.selection_method),
      relevanceFilterMode: asString(audit.relevance_filter_mode),
      searchMode: asString(audit.search_mode),
    },
    responseTimeMs,
    rawResponse: upstream,
  };
};
