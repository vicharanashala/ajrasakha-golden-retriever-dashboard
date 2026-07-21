export interface SearchPayload {
  rephrased_query: string;
  crop: string;
  state: string;
}

export type ApiVersion = 'v1' | 'v2';
export type TesterMode = 'old' | 'new' | 'comparison';

export interface AnswerShortenerPayload {
  originalQuery: string;
  expectedCharacters: number | null;
  originalAnswer: string;
}

export interface AnswerShortenerResponse {
  fullAnswer: string;
  shortAnswer: string;
  originalCharacterCount: number;
  expectedCharacterCount: number;
  minimumCharacterCount: number;
  maximumCharacterCount: number;
  actualCharacterCount: number;
  footerCharacterCount: number;
  tolerance: number;
  withinTolerance: boolean;
}

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
  combinedScore: number | null;
  relevanceScore: number | null;
  retrievalSources: string[];
  classification: string | null;
  answerFromClass: string | null;
  chosenForAnswer: boolean;
  action: string | null;
  llmParseOk: boolean | null;
  relevanceDecision: string | null;
  relevanceReason: string | null;
  sources: Source[];
}

export interface RelatedMatch {
  questionId: string | null;
  question: string;
  similarityScore: number | null;
  combinedScore: number | null;
  relevanceScore: number | null;
  retrievalSources: string[];
  relevanceDecision: string | null;
  relevanceReason: string | null;
  classification: string | null;
  action: string | null;
  llmParseOk: boolean | null;
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
    searchMode: string | null;
  };
  responseTimeMs: number;
  rawResponse: unknown;
}
