import { type FormEvent, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Send } from 'lucide-react';
import {
  AnswerShortenerFeedbackApiError,
  createAnswerShortenerFeedbackSubmission,
  submitAnswerShortenerFeedback,
  type AnswerShortenerFeedbackSubmission,
} from '../services/answer-shortener-feedback-api';
import {
  downloadFeedbackCsv,
  FeedbackDownloadError,
} from '../services/feedback-download-api';
import type { AnswerShortenerPayload, AnswerShortenerResponse } from '../types';

interface AnswerShortenerFeedbackPanelProps {
  testerName: string;
  payload: AnswerShortenerPayload;
  result: AnswerShortenerResponse;
}

export function AnswerShortenerFeedbackPanel({
  testerName,
  payload,
  result,
}: AnswerShortenerFeedbackPanelProps) {
  const [issue, setIssue] = useState('');
  const [pendingSubmission, setPendingSubmission] =
    useState<AnswerShortenerFeedbackSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (issue.trim().length < 3) {
      setStatus({
        type: 'error',
        message: 'Please describe the issue before submitting.',
      });
      return;
    }

    setStatus(null);
    try {
      setPendingSubmission(
        createAnswerShortenerFeedbackSubmission(
          testerName,
          payload,
          result,
          issue,
        ),
      );
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Feedback could not be prepared.',
      });
    }
  };

  const confirmSubmission = async () => {
    if (!pendingSubmission) return;

    setSubmitting(true);
    setStatus(null);
    try {
      await submitAnswerShortenerFeedback(pendingSubmission);
      setIssue('');
      setPendingSubmission(null);
      setStatus({ type: 'success', message: 'Issue reported successfully.' });
    } catch (error) {
      setPendingSubmission(null);
      setStatus({
        type: 'error',
        message:
          error instanceof AnswerShortenerFeedbackApiError
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
      await downloadFeedbackCsv(
        '/api/answer-shortener-feedback/download',
        testerName,
      );
      setStatus({
        type: 'success',
        message: 'Your Answer Shortener feedback was downloaded.',
      });
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
      <section
        className="feedback-panel shortener-feedback-panel"
        aria-labelledby="shortener-feedback-heading"
      >
        <h2 id="shortener-feedback-heading">Report an issue</h2>
        <p>
          The report will include this test request and all Answer Shortener
          response values.
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
              onChange={(event) => {
                setIssue(event.target.value);
                setStatus(null);
              }}
              placeholder="Describe the issue with the shortened answer"
              rows={6}
              maxLength={3_000}
            />
          </label>

          <button className="feedback-submit" type="submit">
            <Send size={16} /> Submit issue
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
          aria-labelledby="confirm-shortener-feedback-heading"
        >
          <div className="confirm-dialog">
            <h2 id="confirm-shortener-feedback-heading">Confirm issue report</h2>
            <p>You are reporting this issue for the following test request:</p>
            <dl>
              <div>
                <dt>Tester</dt>
                <dd>{testerName}</dd>
              </div>
              <div>
                <dt>Original query</dt>
                <dd>{payload.originalQuery}</dd>
              </div>
              <div>
                <dt>Expected characters</dt>
                <dd>{payload.expectedCharacters}</dd>
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
