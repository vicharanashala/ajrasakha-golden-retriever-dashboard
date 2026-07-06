export interface SearchRequest {
  rephrased_query: string;
  crop: string;
  state: string;
}

export interface SourceDetail {
  source_name?: unknown;
  source_link?: unknown;
  author_name?: unknown;
}

export interface UpstreamMatch {
  question_id?: unknown;
  similarity_score?: unknown;
  retrieval_source?: unknown;
  question?: unknown;
  answer?: unknown;
  details?: unknown;
  gemma_class?: unknown;
  chosen_for_answer?: unknown;
  answer_from_class?: unknown;
  [key: string]: unknown;
}

export interface AuditEvaluation {
  question_id?: unknown;
  similarity_score?: unknown;
  retrieved_question?: unknown;
  relevance_decision?: unknown;
  relevance_reason?: unknown;
  classification?: unknown;
  reason?: unknown;
  llm_parse_ok?: unknown;
  action?: unknown;
  chosen_for_answer?: unknown;
}

export interface ClassificationAudit {
  status?: unknown;
  model?: unknown;
  relevance_filter_mode?: unknown;
  evaluations?: unknown;
  selected_question_id?: unknown;
  selection_rule?: unknown;
  answer_from_class?: unknown;
  selection_method?: unknown;
  chosen_for_answer?: unknown;
}

export interface UpstreamSearchResponse {
  original_query?: unknown;
  refined_query?: unknown;
  removed_entities?: unknown;
  rephrased_query?: unknown;
  crop?: unknown;
  state?: unknown;
  exact_match?: unknown;
  selected_match?: unknown;
  classification_audit?: unknown;
  [key: string]: unknown;
}

export interface NormalizedSource {
  name: string;
  url: string | null;
  author: string | null;
}

export interface NormalizedMatch {
  questionId: string | null;
  question: string;
  answer: string;
  similarityScore: number | null;
  retrievalSource: string;
  classification: string | null;
  answerFromClass: string | null;
  chosenForAnswer: boolean;
  relevanceDecision: string | null;
  relevanceReason: string | null;
  sources: NormalizedSource[];
}

export interface RelatedMatch {
  questionId: string | null;
  question: string;
  similarityScore: number | null;
  relevanceDecision: string | null;
  relevanceReason: string | null;
  classification: string | null;
  action: string | null;
}

export type MatchType = 'exact' | 'semantic' | 'none';

export interface NormalizedSearchResponse {
  query: string;
  crop: string;
  state: string;
  matchType: MatchType;
  selectedMatch: NormalizedMatch | null;
  relatedMatches: RelatedMatch[];
  audit: {
    status: string | null;
    model: string | null;
    selectionRule: string | null;
    selectionMethod: string | null;
    relevanceFilterMode: string | null;
  };
  responseTimeMs: number;
  rawResponse: UpstreamSearchResponse;
}
