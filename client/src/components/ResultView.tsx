import { useMemo, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { SearchResponse, Source } from '../types';
import { formatPercentage, humanizeToken } from '../utils/format';

interface DisplayResult {
  id: string;
  question: string;
  similarityScore: number | null;
  answer: string | null;
  sources: Source[];
  relevanceDecision: string | null;
  relevanceReason: string | null;
  classification: string | null;
  retrievalSource: string | null;
}

interface ResultViewProps {
  apiLabel: 'Old API' | 'New API';
  result: SearchResponse;
}

const getUniqueAuthors = (sources: Source[]) => {
  const authors = new Map<string, string>();

  sources.forEach(({ author }) => {
    const normalizedAuthor = author?.trim();
    if (normalizedAuthor) {
      authors.set(normalizedAuthor.toLocaleLowerCase(), normalizedAuthor);
    }
  });

  return [...authors.values()];
};

export function ResultView({ apiLabel, result }: ResultViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const retrievedResults = useMemo<DisplayResult[]>(() => {
    const selectedItems: DisplayResult[] = [];

    if (result.selectedMatch) {
      selectedItems.push({
        id: result.selectedMatch.questionId ?? 'selected-result',
        question: result.selectedMatch.question,
        similarityScore: result.selectedMatch.similarityScore,
        answer: result.selectedMatch.answer,
        sources: result.selectedMatch.sources,
        relevanceDecision: result.selectedMatch.relevanceDecision,
        relevanceReason: result.selectedMatch.relevanceReason,
        classification: result.selectedMatch.classification,
        retrievalSource: result.selectedMatch.retrievalSource,
      });
    }

    const relatedItems = result.relatedMatches
      .map((match, index): DisplayResult => ({
          id: match.questionId ?? `related-result-${index}`,
          question: match.question,
          similarityScore: match.similarityScore,
          answer: null,
          sources: [],
          relevanceDecision: match.relevanceDecision,
          relevanceReason: match.relevanceReason,
          classification: match.classification,
          retrievalSource: null,
        }))
      .sort(
        (left, right) =>
          (right.similarityScore ?? -1) - (left.similarityScore ?? -1),
      );

    return [...selectedItems, ...relatedItems].slice(0, 5);
  }, [result]);

  const primaryResults = result.selectedMatch ? retrievedResults.slice(0, 1) : [];
  const otherResults = result.selectedMatch
    ? retrievedResults.slice(1)
    : retrievedResults;

  const renderResultItem = (item: DisplayResult, index: number) => {
    const expanded = expandedId === item.id;
    const authors = getUniqueAuthors(item.sources);

    return (
      <li
        className={`retrieved-item${expanded ? ' is-expanded' : ''}`}
        key={item.id}
      >
        <button
          className="result-toggle"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpandedId(expanded ? null : item.id)}
        >
          <span className="result-rank">{index + 1}</span>
          <span className="result-question">{item.question}</span>
          <strong>{formatPercentage(item.similarityScore)}</strong>
          <ChevronDown className="result-chevron" size={19} />
        </button>

        {expanded && (
          <div className="result-details">
            <div className="detail-meta">
              {item.relevanceDecision && (
                <span>Decision: {humanizeToken(item.relevanceDecision)}</span>
              )}
              {item.classification && (
                <span>Class: {humanizeToken(item.classification)}</span>
              )}
              {item.retrievalSource && (
                <span>Source: {item.retrievalSource.toUpperCase()}</span>
              )}
            </div>

            {item.relevanceReason && (
              <div className="detail-section">
                <h3>Relevance reason</h3>
                <p>{item.relevanceReason}</p>
              </div>
            )}

            {item.answer ? (
              <div className="detail-section">
                <h3>Answer</h3>
                <div className="answer-text">{item.answer}</div>
              </div>
            ) : (
              <p className="unavailable-note">
                An answer was not included for this candidate in the current API
                response.
              </p>
            )}

            {item.answer && authors.length > 0 && (
              <p className="answered-by">
                <strong>Answered by:</strong> {authors.join(', ')}
              </p>
            )}

            {item.sources.length > 0 && (
              <div className="detail-section">
                <h3>Sources</h3>
                <div className="compact-sources">
                  {item.sources.map((source, sourceIndex) => (
                    <a
                      key={`${source.name}-${sourceIndex}`}
                      href={source.url ?? undefined}
                      target={source.url ? '_blank' : undefined}
                      rel={source.url ? 'noreferrer' : undefined}
                    >
                      <span>{source.name}</span>
                      {source.url && <ExternalLink size={14} />}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <section className="results-panel" aria-live="polite">
      <div className="results-heading">
        <div>
          <h2>Retrieved question</h2>
          <p>Expand the selected question to review its details.</p>
        </div>
        <div className="results-heading__badges">
          <span className="api-badge">{apiLabel}</span>
        </div>
      </div>

      <ol className="result-list">
        {primaryResults.map((item, index) => renderResultItem(item, index))}
      </ol>

      {otherResults.length > 0 && (
        <>
          <div className="results-subheading">
            <h3>Other retrieved questions</h3>
            <span className="result-count">{otherResults.length} results</span>
          </div>
          <ol className="result-list result-list--secondary">
            {otherResults.map((item, index) =>
              renderResultItem(item, primaryResults.length + index),
            )}
          </ol>
        </>
      )}
    </section>
  );
}
