export interface SearchRequest {
  rephrased_query: string;
  crop: string;
  state: string;
}

export type ApiVersion = 'v1' | 'v2';

export type UpstreamSearchResponse = Record<string, unknown>;
