import { type FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Send } from 'lucide-react';
import {
  downloadFeedbackCsv,
  FeedbackDownloadError,
} from '../services/feedback-download-api';
import { submitFeedback, type FeedbackSubmission } from '../services/feedback-api';
import type { ApiVersion, SearchPayload, SearchResponse, Source } from '../types';
import { formatPercentage, humanizeToken } from '../utils/format';

interface FeedbackResultSet {
  apiLabel: 'Old API' | 'New API';
  version: ApiVersion;
  result?: SearchResponse;
  error?: string;
}

interface FeedbackPanelProps {
  testerName: string;
  searchPayload: SearchPayload;
  resultSets: FeedbackResultSet[];
}

type SubmitStatus =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null;

const emptyApiSummary = {
  retrievedQuestion: '',
  answerWithSources: '',
  questionId: '',
  similarityScore: '',
  retrievalSource: '',
  otherQuestions: '',
};

const joinValues = (values: string[]) =>
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .join(', ');

const formatRetrievalSources = (sources: string[]) =>
  joinValues(sources.map((source) => humanizeToken(source)));

const formatSources = (sources: Source[]) =>
  sources
    .map((source, index) => {
      const pieces = [
        `${index + 1}. ${source.name}`,
        source.url ? `Link: ${source.url}` : '',
        source.author ? `Author: ${source.author}` : '',
      ].filter(Boolean);

      return pieces.join(' | ');
    })
    .join('\n');

const summarizeApiResult = (resultSet?: FeedbackResultSet) => {
  if (!resultSet) return emptyApiSummary;

  if (resultSet.error) {
    return {
      ...emptyApiSummary,
      retrievedQuestion: `API failed: ${resultSet.error}`,
    };
  }

  const result = resultSet.result;
  if (!result) return emptyApiSummary;

  const selected = result.selectedMatch;
  const sourcesText = selected?.sources.length
    ? `\n\nSources:\n${formatSources(selected.sources)}`
    : '';

  const otherQuestions = result.relatedMatches
    .map((match, index) => {
      const parts = [
        `${index + 1}. ${match.question}`,
        match.questionId ? `Question ID: ${match.questionId}` : '',
        `Similarity: ${formatPercentage(match.similarityScore)}`,
        match.retrievalSources.length
          ? `Retrieval source: ${formatRetrievalSources(match.retrievalSources)}`
          : '',
      ].filter(Boolean);

      return parts.join(' | ');
    })
    .join('\n');

  return {
    retrievedQuestion: selected?.question ?? '',
    answerWithSources: selected?.answer
      ? `${selected.answer}${sourcesText}`
      : sourcesText.trim(),
    questionId: selected?.questionId ?? '',
    similarityScore: selected ? formatPercentage(selected.similarityScore) : '',
    retrievalSource: selected
      ? formatRetrievalSources(selected.retrievalSources)
      : '',
    otherQuestions,
  };
};

export function FeedbackPanel({
  testerName,
  searchPayload,
  resultSets,
}: FeedbackPanelProps) {
  const [issue, setIssue] = useState('');
  const [pendingSubmission, setPendingSubmission] =
    useState<FeedbackSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>(null);

  const feedbackPayload = useMemo<FeedbackSubmission>(() => {
    const oldApi = summarizeApiResult(
      resultSets.find((resultSet) => resultSet.version === 'v1'),
    );
    const newApi = summarizeApiResult(
      resultSets.find((resultSet) => resultSet.version === 'v2'),
    );

    return {
      tester_name: testerName,
      input_question: searchPayload.rephrased_query.trim(),
      state: searchPayload.state,
      crop: searchPayload.crop.trim(),
      retrieved_question_api_v1: oldApi.retrievedQuestion,
      retrieved_question_api_v2: newApi.retrievedQuestion,
      retrieved_answer_with_sources_v1: oldApi.answerWithSources,
      retrieved_answer_with_sources_v2: newApi.answerWithSources,
      question_id_v1: oldApi.questionId,
      question_id_v2: newApi.questionId,
      similarity_score: joinValues([
        oldApi.similarityScore ? `v1: ${oldApi.similarityScore}` : '',
        newApi.similarityScore ? `v2: ${newApi.similarityScore}` : '',
      ]),
      retrieval_source: joinValues([
        oldApi.retrievalSource ? `v1: ${oldApi.retrievalSource}` : '',
        newApi.retrievalSource ? `v2: ${newApi.retrievalSource}` : '',
      ]),
      all_other_fetched_questions_v1: oldApi.otherQuestions,
      all_other_fetched_questions_v2: newApi.otherQuestions,
      issue_faced: issue.trim(),
    };
  }, [issue, resultSets, searchPayload, testerName]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (issue.trim().length < 3) {
      setStatus({
        type: 'error',
        message: 'Please describe the issue before submitting.',
      });
      return;
    }

    setPendingSubmission(feedbackPayload);
  };

  const confirmSubmission = async () => {
    if (!pendingSubmission) return;

    setSubmitting(true);
    setStatus(null);

    try {
      await submitFeedback(pendingSubmission);
      setIssue('');
      setPendingSubmission(null);
      setStatus({
        type: 'success',
        message: 'Issue reported successfully.',
      });
    } catch (error) {
      setPendingSubmission(null);
      setStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Issue could not be reported.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadMyFeedback = async () => {
    setDownloading(true);
    setStatus(null);

    try {
      await downloadFeedbackCsv('/api/feedback/download', testerName);
      setStatus({ type: 'success', message: 'Your retrieval feedback was downloaded.' });
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error instanceof FeedbackDownloadError
            ? error.message
            : 'Feedback could not be downloaded.',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <section className="feedback-panel" aria-labelledby="feedback-heading">
        <h2 id="feedback-heading">Report your issue here</h2>
        <p>
          The report will include the current question, state, crop, and the
          retrieved outputs from the selected API mode.
        </p>
        <button
          className="feedback-download"
          type="button"
          disabled={downloading}
          onClick={downloadMyFeedback}
        >
          <Download size={15} />
          {downloading ? 'Preparing download...' : 'Download my feedback'}
        </button>

        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Issue faced</span>
            <textarea
              value={issue}
              onChange={(event) => setIssue(event.target.value)}
              placeholder="Describe the issue with the retrieved result"
              rows={7}
              maxLength={3_000}
            />
          </label>

          <button
            className="feedback-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? <span className="spinner" /> : <Send size={16} />}
            {submitting ? 'Submitting...' : 'Submit issue'}
          </button>
        </form>

        {status && (
          <p className={`feedback-status feedback-status--${status.type}`}>
            {status.type === 'success' ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertTriangle size={15} />
            )}
            {status.message}
          </p>
        )}
      </section>

      {pendingSubmission && (
        <div
          className="confirm-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-feedback-heading"
        >
          <div className="confirm-dialog">
            <h2 id="confirm-feedback-heading">Confirm issue report</h2>
            <p>
              You are reporting this issue for the following search context:
            </p>
            <dl>
              <div>
                <dt>Question</dt>
                <dd>{pendingSubmission.input_question}</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{pendingSubmission.state}</dd>
              </div>
              <div>
                <dt>Crop</dt>
                <dd>{pendingSubmission.crop}</dd>
              </div>
            </dl>
            <div className="confirm-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={submitting}
                onClick={() => setPendingSubmission(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={submitting}
                onClick={confirmSubmission}
              >
                {submitting ? 'Reporting...' : 'Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
