import { type FormEvent, useState } from 'react';
import { Leaf, Lock } from 'lucide-react';

interface LoginPanelProps {
  onLogin: (testerName: string) => void;
}

const dashboardPassword =
  import.meta.env.VITE_DASHBOARD_PASSWORD || 'golden-tester';

export function LoginPanel({ onLogin }: LoginPanelProps) {
  const [testerName, setTesterName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (testerName.trim().length < 2) {
      setError('Enter tester name.');
      return;
    }

    if (password !== dashboardPassword) {
      setError('Incorrect dashboard password.');
      return;
    }

    setError('');
    onLogin(testerName.trim());
  };

  return (
    <main className="login-shell">
      <section className="login-card">
        <span className="brand__icon" aria-hidden="true">
          <Leaf size={22} />
        </span>
        <div>
          <h1>Golden Retrieval Tester</h1>
          <p>Enter tester details to continue to the dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="form-field">
            <span>Tester name</span>
            <input
              value={testerName}
              onChange={(event) => setTesterName(event.target.value)}
              placeholder="Type tester name"
              autoComplete="name"
              maxLength={80}
            />
          </label>

          <label className="form-field">
            <span>
              <Lock size={14} /> Password
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Type dashboard password"
              type="password"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button className="primary-button" type="submit">
            Continue
          </button>
        </form>
      </section>
    </main>
  );
}
