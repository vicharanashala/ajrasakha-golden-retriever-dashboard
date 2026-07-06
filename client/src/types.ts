export interface SearchPayload {
  rephrased_query: string;
  crop: string;
  state: string;
}

export type ApiVersion = 'v1' | 'v2';
export type TesterMode = 'old' | 'new' | 'comparison';

export interface Source {
  name: string;
  url: string | null;
  author: string | null;
}

export interface SelectedMatch {
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
  sources: Source[];
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

export interface SearchResponse {
  query: string;
  crop: string;
  state: string;
  matchType: 'exact' | 'semantic' | 'none';
  selectedMatch: SelectedMatch | null;
  relatedMatches: RelatedMatch[];
  audit: {
    status: string | null;
    model: string | null;
    selectionRule: string | null;
    selectionMethod: string | null;
    relevanceFilterMode: string | null;
  };
  responseTimeMs: number;
  rawResponse: unknown;
}
