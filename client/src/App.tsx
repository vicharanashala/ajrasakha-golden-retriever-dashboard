import { useState } from 'react';
import {
  AlertTriangle,
  Columns2,
  FileText,
  History,
  Info,
  Leaf,
  Sparkles,
} from 'lucide-react';
import { FeedbackPanel } from './components/FeedbackPanel';
import { AnswerShortenerTester } from './components/AnswerShortenerTester';
import { LoginPanel } from './components/LoginPanel';
import { LoadingState } from './components/LoadingState';
import { ResultView } from './components/ResultView';
import { SearchForm } from './components/SearchForm';
import { SearchApiError, submitSearch } from './services/search-api';
import type {
  ApiVersion,
  SearchPayload,
  SearchResponse,
  TesterMode,
} from './types';

interface ResultSet {
  apiLabel: 'Old API' | 'New API';
  version: ApiVersion;
  result?: SearchResponse;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const modes: Array<{
  value: TesterMode;
  label: string;
  icon: typeof History;
}> = [
  { value: 'old', label: 'Old API', icon: History },
  { value: 'new', label: 'New API', icon: Sparkles },
  { value: 'comparison', label: 'Comparison', icon: Columns2 },
];

const executeSearch = async (
  payload: SearchPayload,
  version: ApiVersion,
  apiLabel: ResultSet['apiLabel'],
): Promise<ResultSet> => {
  try {
    return {
      apiLabel,
      version,
      result: await submitSearch(payload, version),
    };
  } catch (error) {
    if (error instanceof SearchApiError) {
      return {
        apiLabel,
        version,
        error: error.message,
        fieldErrors: error.fieldErrors,
      };
    }

    return {
      apiLabel,
      version,
      error: 'An unexpected error occurred while searching.',
    };
  }
};

function App() {
  const [testerName, setTesterName] = useState(
    () => window.sessionStorage.getItem('golden-retrieval-tester') ?? '',
  );
  const [searchPayload, setSearchPayload] = useState<SearchPayload>({
    rephrased_query: '',
    crop: '',
    state: '',
  });
  const [lastSearchPayload, setLastSearchPayload] =
    useState<SearchPayload | null>(null);
  const [mode, setMode] = useState<TesterMode>('old');
  const [resultSets, setResultSets] = useState<ResultSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [workspace, setWorkspace] = useState<'retrieval' | 'shortener'>('retrieval');

  const login = (nextTesterName: string) => {
    window.sessionStorage.setItem('golden-retrieval-tester', nextTesterName);
    setTesterName(nextTesterName);
  };

  const logout = () => {
    window.sessionStorage.removeItem('golden-retrieval-tester');
    setTesterName('');
  };

  const changeMode = (nextMode: TesterMode) => {
    setMode(nextMode);
    setResultSets([]);
    setFieldErrors({});
    setLastSearchPayload(null);
  };

  const runSearch = async (payload: SearchPayload) => {
    setLoading(true);
    setFieldErrors({});
    setResultSets([]);
    setLastSearchPayload(payload);

    const attempts =
      mode === 'comparison'
        ? await Promise.all([
            executeSearch(payload, 'v1', 'Old API'),
            executeSearch(payload, 'v2', 'New API'),
          ])
        : [
            await executeSearch(
              payload,
              mode === 'new' ? 'v2' : 'v1',
              mode === 'new' ? 'New API' : 'Old API',
            ),
          ];

    setResultSets(attempts);
    setFieldErrors(
      attempts.reduce<Record<string, string[]>>(
        (allErrors, attempt) => ({
          ...allErrors,
          ...attempt.fieldErrors,
        }),
        {},
      ),
    );
    setLoading(false);
  };

  if (!testerName) {
    return <LoginPanel onLogin={login} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <span className="brand__icon" aria-hidden="true">
            <Leaf size={21} />
          </span>
          <span className="brand__name">Golden Retrieval Tester</span>
          <span className="tester-chip">Tester: {testerName}</span>
          <button className="logout-button" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <nav className="workspace-nav" aria-label="Dashboard tools">
        <div className="workspace-nav__inner">
          <button className={workspace === 'retrieval' ? 'is-active' : ''} type="button" onClick={() => setWorkspace('retrieval')}><Leaf size={16} /> Retrieval tester</button>
          <button className={workspace === 'shortener' ? 'is-active' : ''} type="button" onClick={() => setWorkspace('shortener')}><FileText size={16} /> Answer shortener</button>
        </div>
      </nav>

      {workspace === 'shortener' ? <main><AnswerShortenerTester testerName={testerName} /></main> : <main className={mode === 'comparison' ? 'main--comparison' : undefined}>
        <section className="mode-panel" aria-labelledby="mode-heading">
          <h2 id="mode-heading">Choose retrieval mode</h2>
          <div className="mode-selector">
            {modes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  className={mode === item.value ? 'is-active' : ''}
                  type="button"
                  aria-pressed={mode === item.value}
                  onClick={() => changeMode(item.value)}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        {mode !== 'old' && (
          <aside className="api-note" role="note">
            <Info size={17} aria-hidden="true" />
            <span>
              <strong>Note:</strong> QA pairs in the New API should appear if
              they were created before 4 June.
            </span>
          </aside>
        )}

        <div
          className={
            lastSearchPayload
              ? 'search-feedback-grid'
              : 'search-feedback-grid is-search-only'
          }
        >
          <SearchForm
            payload={searchPayload}
            loading={loading}
            fieldErrors={fieldErrors}
            onPayloadChange={setSearchPayload}
            onSearch={runSearch}
          />

          {lastSearchPayload && (
            <FeedbackPanel
              testerName={testerName}
              searchPayload={lastSearchPayload}
              resultSets={resultSets}
            />
          )}
        </div>

        {loading ? (
          <LoadingState />
        ) : resultSets.length ? (
          <div className={mode === 'comparison' ? 'comparison-results' : ''}>
            {resultSets.map(({ apiLabel, version, result, error }) => {
              if (error) {
                return (
                  <section
                    className="api-status-card api-status-card--error"
                    key={version}
                    role="alert"
                  >
                    <span className="api-badge">{apiLabel}</span>
                    <AlertTriangle size={25} aria-hidden="true" />
                    <h2>{apiLabel} failed</h2>
                    <p>{error}</p>
                  </section>
                );
              }

              if (!result?.selectedMatch && !result?.relatedMatches.length) {
                return (
                  <section className="api-status-card" key={version}>
                    <span className="api-badge">{apiLabel}</span>
                    <h2>No results</h2>
                    <p>{apiLabel} did not return any retrieved questions.</p>
                  </section>
                );
              }

              return (
                <ResultView
                  key={`${version}-${result.query}-${result.responseTimeMs}`}
                  apiLabel={apiLabel}
                  result={result}
                />
              );
            })}
          </div>
        ) : null}
      </main>}
    </div>
  );
}

export default App;
