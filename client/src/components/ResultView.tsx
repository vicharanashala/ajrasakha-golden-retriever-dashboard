import { useMemo, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { SearchResponse, Source } from '../types';
import { formatPercentage, humanizeToken } from '../utils/format';

interface DisplayResult {
  id: string;
  question: string;
  similarityScore: number | null;
  combinedScore: number | null;
  relevanceScore: number | null;
  answer: string | null;
  sources: Source[];
  relevanceDecision: string | null;
  relevanceReason: string | null;
  classification: string | null;
  answerFromClass: string | null;
  action: string | null;
  llmParseOk: boolean | null;
  retrievalSources: string[];
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

const formatRetrievalSources = (sources: string[]) =>
  sources.map((source) => humanizeToken(source)).join(', ');

export function ResultView({ apiLabel, result }: ResultViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [otherResultsVisible, setOtherResultsVisible] = useState(false);

  const retrievedResults = useMemo<DisplayResult[]>(() => {
    const selectedItems: DisplayResult[] = [];

    if (result.selectedMatch) {
      selectedItems.push({
        id: result.selectedMatch.questionId ?? 'selected-result',
        question: result.selectedMatch.question,
        similarityScore: result.selectedMatch.similarityScore,
        combinedScore: result.selectedMatch.combinedScore,
        relevanceScore: result.selectedMatch.relevanceScore,
        answer: result.selectedMatch.answer,
        sources: result.selectedMatch.sources,
        relevanceDecision: result.selectedMatch.relevanceDecision,
        relevanceReason: result.selectedMatch.relevanceReason,
        classification: result.selectedMatch.classification,
        answerFromClass: result.selectedMatch.answerFromClass,
        action: result.selectedMatch.action,
        llmParseOk: result.selectedMatch.llmParseOk,
        retrievalSources: result.selectedMatch.retrievalSources,
      });
    }

    const relatedItems = result.relatedMatches
      .map((match, index): DisplayResult => ({
        id: match.questionId ?? `related-result-${index}`,
        question: match.question,
        similarityScore: match.similarityScore,
        combinedScore: match.combinedScore,
        relevanceScore: match.relevanceScore,
        answer: null,
        sources: [],
        relevanceDecision: match.relevanceDecision,
        relevanceReason: match.relevanceReason,
        classification: match.classification,
        answerFromClass: null,
        action: match.action,
        llmParseOk: match.llmParseOk,
        retrievalSources: match.retrievalSources,
      }))
      .sort(
        (left, right) =>
          (right.combinedScore ?? right.similarityScore ?? -1) -
          (left.combinedScore ?? left.similarityScore ?? -1),
      );

    const allItems = [...selectedItems, ...relatedItems];
    const isCombinedSearch = allItems.some(
      (item) => item.combinedScore !== null,
    );
    return isCombinedSearch ? allItems : allItems.slice(0, 5);
  }, [result]);

  const primaryResults = result.selectedMatch ? retrievedResults.slice(0, 1) : [];
  const otherResults = result.selectedMatch
    ? retrievedResults.slice(1)
    : retrievedResults;

  const renderScoreSummary = (item: DisplayResult) => (
    <span className="result-score-summary">
      <span>
        <small>Similarity</small>
        <strong>{formatPercentage(item.similarityScore)}</strong>
      </span>
    </span>
  );

  const renderResultDetails = (item: DisplayResult) => {
    const authors = getUniqueAuthors(item.sources);
    const retrievalSources = formatRetrievalSources(item.retrievalSources);

    return (
      <div className="result-details">
        <div className="detail-meta">
          <span>Similarity: {formatPercentage(item.similarityScore)}</span>
          {retrievalSources && (
            <span>Retrieval source: {retrievalSources}</span>
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
    );
  };

  const renderResultItem = (
    item: DisplayResult,
    index: number,
    isPrimary = false,
  ) => {
    const expanded = isPrimary || expandedId === item.id;
    const retrievalSources = formatRetrievalSources(item.retrievalSources);

    return (
      <li
        className={`retrieved-item${expanded ? ' is-expanded' : ''}${
          isPrimary ? ' retrieved-item--primary' : ''
        }`}
        key={item.id}
      >
        {isPrimary ? (
          <div className="result-toggle result-toggle--static">
            <span className="result-rank">{index + 1}</span>
            <span className="result-question-content">
              <span className="result-question">{item.question}</span>
            </span>
            {renderScoreSummary(item)}
          </div>
        ) : (
          <button
            className="result-toggle"
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpandedId(expanded ? null : item.id)}
          >
            <span className="result-rank">{index + 1}</span>
            <span className="result-question-content">
              <span className="result-question">{item.question}</span>
              {retrievalSources && (
                <span className="retrieval-source-tag">{retrievalSources}</span>
              )}
            </span>
            {renderScoreSummary(item)}
            <ChevronDown className="result-chevron" size={19} />
          </button>
        )}

        {expanded && renderResultDetails(item)}
      </li>
    );
  };

  return (
    <section className="results-panel" aria-live="polite">
      <div className="results-heading">
        <div>
          <h2>Retrieved question</h2>
          <p>The selected answer is shown in full below.</p>
        </div>
        <div className="results-heading__badges">
          <span className="api-badge">{apiLabel}</span>
        </div>
      </div>

      <ol className="result-list">
        {primaryResults.map((item, index) => renderResultItem(item, index, true))}
      </ol>

      {otherResults.length > 0 && (
        <>
          <div className="results-subheading">
            <button
              className="results-subheading__toggle"
              type="button"
              aria-expanded={otherResultsVisible}
              onClick={() => setOtherResultsVisible((visible) => !visible)}
            >
              <span>Other retrieved questions</span>
              <span className="result-count">{otherResults.length} results</span>
              <ChevronDown
                className={`results-subheading__chevron${
                  otherResultsVisible ? ' is-open' : ''
                }`}
                size={19}
              />
            </button>
          </div>
          {otherResultsVisible && (
            <ol className="result-list result-list--secondary">
              {otherResults.map((item, index) =>
                renderResultItem(item, primaryResults.length + index),
              )}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
