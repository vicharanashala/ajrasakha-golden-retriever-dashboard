import { useState } from 'react';
import {
  AlertTriangle,
  Columns2,
  History,
  Leaf,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
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
  result: SearchResponse;
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

function App() {
  const [mode, setMode] = useState<TesterMode>('old');
  const [resultSets, setResultSets] = useState<ResultSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [hasSearched, setHasSearched] = useState(false);

  const changeMode = (nextMode: TesterMode) => {
    setMode(nextMode);
    setResultSets([]);
    setError('');
    setFieldErrors({});
    setHasSearched(false);
  };

  const runSearch = async (payload: SearchPayload) => {
    setLoading(true);
    setError('');
    setFieldErrors({});
    setResultSets([]);

    try {
      if (mode === 'comparison') {
        const [oldResult, newResult] = await Promise.all([
          submitSearch(payload, 'v1'),
          submitSearch(payload, 'v2'),
        ]);
        setResultSets([
          { apiLabel: 'Old API', version: 'v1', result: oldResult },
          { apiLabel: 'New API', version: 'v2', result: newResult },
        ]);
      } else {
        const version: ApiVersion = mode === 'new' ? 'v2' : 'v1';
        setResultSets([
          {
            apiLabel: mode === 'new' ? 'New API' : 'Old API',
            version,
            result: await submitSearch(payload, version),
          },
        ]);
      }
      setHasSearched(true);
    } catch (searchError) {
      setHasSearched(true);
      if (searchError instanceof SearchApiError) {
        setError(searchError.message);
        setFieldErrors(searchError.fieldErrors);
      } else {
        setError('An unexpected error occurred while searching.');
      }
    } finally {
      setLoading(false);
    }
  };

  const visibleResultSets = resultSets.filter(
    ({ result }) => result.selectedMatch || result.relatedMatches.length,
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <span className="brand__icon" aria-hidden="true">
            <Leaf size={21} />
          </span>
          <span className="brand__name">Golden Retrieval Tester</span>
        </div>
      </header>

      <main className={mode === 'comparison' ? 'main--comparison' : undefined}>
        <section className="mode-panel" aria-labelledby="mode-heading">
          <span id="mode-heading">Choose retrieval mode</span>
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

        <SearchForm
          loading={loading}
          fieldErrors={fieldErrors}
          onSearch={runSearch}
        />

        {error && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={20} />
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}>
              <RotateCcw size={15} /> Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : visibleResultSets.length ? (
          <div className={mode === 'comparison' ? 'comparison-results' : ''}>
            {visibleResultSets.map(({ apiLabel, version, result }) => (
              <ResultView
                key={`${version}-${result.query}-${result.responseTimeMs}`}
                apiLabel={apiLabel}
                result={result}
              />
            ))}
          </div>
        ) : hasSearched && !error ? (
          <div className="no-results">No retrieved questions were returned.</div>
        ) : null}
      </main>
    </div>
  );
}

export default App;
