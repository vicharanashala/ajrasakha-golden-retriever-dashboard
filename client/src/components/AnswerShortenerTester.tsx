import { type FormEvent, useState } from 'react';
import { Check, Clipboard, Scissors, Send } from 'lucide-react';
import { AnswerShortenerFeedbackPanel } from './AnswerShortenerFeedbackPanel';
import {
  AnswerShortenerApiError,
  submitAnswerShortener,
} from '../services/answer-shortener-api';
import type { AnswerShortenerPayload, AnswerShortenerResponse } from '../types';

interface AnswerShortenerTesterProps {
  testerName: string;
}

const initialPayload: AnswerShortenerPayload = {
  originalQuery: '',
  expectedCharacters: null,
  originalAnswer: '',
};

const copyText = async (text: string) => {
  await navigator.clipboard?.writeText(text);
};

export function AnswerShortenerTester({ testerName }: AnswerShortenerTesterProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [result, setResult] = useState<AnswerShortenerResponse | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'full' | 'short' | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (payload.originalQuery.trim().length < 3) {
      nextErrors.originalQuery = 'Enter the original query.';
    }
    if (
      payload.expectedCharacters === null ||
      !Number.isInteger(payload.expectedCharacters) ||
      payload.expectedCharacters < 1
    ) {
      nextErrors.expectedCharacters = 'Enter a whole number greater than zero.';
    }
    if (payload.originalAnswer.trim().length < 3) {
      nextErrors.originalAnswer = 'Enter the original answer.';
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setRequestError(null);
    setLoading(true);
    setResult(null);
    try {
      setResult(await submitAnswerShortener(payload));
    } catch (error) {
      setRequestError(
        error instanceof AnswerShortenerApiError
          ? error.message
          : 'An unexpected error occurred while shortening the answer.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (kind: 'full' | 'short', text: string) => {
    await copyText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1_800);
  };

  const clearRequestError = () => setRequestError(null);

  return (
    <div className="shortener-page">
      <section className="shortener-intro" aria-labelledby="shortener-heading">
        <span className="shortener-intro__icon" aria-hidden="true">
          <Scissors size={21} />
        </span>
        <div>
          <p className="eyebrow">Answer Shortener API</p>
          <h1 id="shortener-heading">Review shortened answers</h1>
          <p>Enter a query and answer to generate a response for review.</p>
        </div>
      </section>

      <div
        className={
          result
            ? 'shortener-grid'
            : 'shortener-grid shortener-grid--form-only'
        }
      >
        <section
          className="search-panel shortener-form-panel"
          aria-labelledby="shortener-form-heading"
        >
          <h2 id="shortener-form-heading">Test request</h2>
          <form onSubmit={onSubmit} noValidate>
            <div className="shortener-fields">
              <label className="form-field">
                <span>Original query</span>
                <textarea
                  value={payload.originalQuery}
                  onChange={(event) => {
                    setPayload((current) => ({ ...current, originalQuery: event.target.value }));
                    setErrors((current) => ({ ...current, originalQuery: '' }));
                    clearRequestError();
                  }}
                  placeholder="Type your original query here"
                  rows={3}
                  maxLength={4_000}
                  aria-invalid={Boolean(errors.originalQuery)}
                />
                {errors.originalQuery && <small>{errors.originalQuery}</small>}
              </label>

              <label className="form-field shortener-character-field">
                <span>Expected number of characters</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={payload.expectedCharacters ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPayload((current) => ({
                      ...current,
                      expectedCharacters: value === '' ? null : Number(value),
                    }));
                    setErrors((current) => ({ ...current, expectedCharacters: '' }));
                    clearRequestError();
                  }}
                  placeholder="Enter character count"
                  aria-invalid={Boolean(errors.expectedCharacters)}
                />
                {errors.expectedCharacters && <small>{errors.expectedCharacters}</small>}
              </label>

              <label className="form-field">
                <span>Original answer</span>
                <textarea
                  value={payload.originalAnswer}
                  onChange={(event) => {
                    setPayload((current) => ({ ...current, originalAnswer: event.target.value }));
                    setErrors((current) => ({ ...current, originalAnswer: '' }));
                    clearRequestError();
                  }}
                  placeholder="Paste the full answer here"
                  rows={10}
                  maxLength={30_000}
                  aria-invalid={Boolean(errors.originalAnswer)}
                />
                {errors.originalAnswer && <small>{errors.originalAnswer}</small>}
              </label>
            </div>
            <button className="search-button" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : <Send size={17} />}
              {loading ? 'Shortening answer...' : 'Submit test'}
            </button>
          </form>
          {requestError && <p className="error-banner" role="alert">{requestError}</p>}
        </section>

        {result && (
            <AnswerShortenerFeedbackPanel
              testerName={testerName}
              payload={payload}
              result={result}
            />
        )}
      </div>

      {result && (
        <section
          className="shortener-results"
          aria-live="polite"
          aria-labelledby="shortener-results-heading"
        >
            <div className="shortener-results__heading">
              <div>
                <p className="eyebrow">API response</p>
                <h2 id="shortener-results-heading">Review result</h2>
              </div>
            </div>

            <div className="answer-review-card">
              <div className="answer-review-card__heading">
                <h3>Short answer</h3>
                <button type="button" onClick={() => handleCopy('short', result.shortAnswer)}>
                  {copied === 'short' ? <Check size={14} /> : <Clipboard size={14} />}
                  {copied === 'short' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p>{result.shortAnswer}</p>
            </div>
            <div className="answer-review-card answer-review-card--full">
              <div className="answer-review-card__heading">
                <h3>Full answer</h3>
                <button type="button" onClick={() => handleCopy('full', result.fullAnswer)}>
                  {copied === 'full' ? <Check size={14} /> : <Clipboard size={14} />}
                  {copied === 'full' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p>{result.fullAnswer}</p>
            </div>

            <div>
              <h3 className="shortener-section-title">Character counts</h3>
              <dl className="shortener-metrics">
                <div><dt>Original</dt><dd>{result.originalCharacterCount}</dd></div>
                <div><dt>Expected</dt><dd>{result.expectedCharacterCount}</dd></div>
                <div><dt>Minimum</dt><dd>{result.minimumCharacterCount}</dd></div>
                <div><dt>Maximum</dt><dd>{result.maximumCharacterCount}</dd></div>
                <div><dt>Actual</dt><dd>{result.actualCharacterCount}</dd></div>
                <div><dt>Footer</dt><dd>{result.footerCharacterCount}</dd></div>
              </dl>
            </div>

            <div className={`tolerance-result${result.withinTolerance ? ' is-within' : ' is-outside'}`}>
              <div>
                <span>Tolerance</span>
                <strong>&plusmn;{result.tolerance} characters</strong>
              </div>
              <p>{result.withinTolerance ? 'Within tolerance' : 'Outside tolerance'}</p>
            </div>
        </section>
      )}
    </div>
  );
}
