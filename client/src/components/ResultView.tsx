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

export function ResultView({ apiLabel, result }: ResultViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const retrievedResults = useMemo<DisplayResult[]>(() => {
    const items: DisplayResult[] = [];

    if (result.selectedMatch) {
      items.push({
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

    result.relatedMatches.forEach((match, index) => {
      items.push({
        id: match.questionId ?? `related-result-${index}`,
        question: match.question,
        similarityScore: match.similarityScore,
        answer: null,
        sources: [],
        relevanceDecision: match.relevanceDecision,
        relevanceReason: match.relevanceReason,
        classification: match.classification,
        retrievalSource: null,
      });
    });

    return items
      .sort(
        (left, right) =>
          (right.similarityScore ?? -1) - (left.similarityScore ?? -1),
      )
      .slice(0, 5);
  }, [result]);

  return (
    <section className="results-panel" aria-live="polite">
      <div className="results-heading">
        <div>
          <h2>Retrieved questions</h2>
          <p>Expand a question to review the details.</p>
        </div>
        <div className="results-heading__badges">
          <span className="api-badge">{apiLabel}</span>
          <span className="result-count">{retrievedResults.length} results</span>
        </div>
      </div>

      <ol className="result-list">
        {retrievedResults.map((item, index) => {
          const expanded = expandedId === item.id;

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
                      <span>
                        Decision: {humanizeToken(item.relevanceDecision)}
                      </span>
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
                      An answer was not included for this candidate in the current
                      API response.
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
                            <span>
                              {source.name}
                              {source.author ? ` - ${source.author}` : ''}
                            </span>
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
        })}
      </ol>
    </section>
  );
}
