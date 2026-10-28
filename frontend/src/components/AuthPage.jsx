
import { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'https://agile-bug-tracker-backend.onrender.com'
).replace(/\/+$/, '');

function AuthPage({ onLoginSuccess }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const endpoint = isLoginView ? 'login' : 'register';

    const payload = isLoginView
      ? { email: email.trim(), password }
      : { name: name.trim(), email: email.trim(), password };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/${endpoint}`,
        payload
      );

      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error('The server returned an invalid authentication response.');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      onLoginSuccess(user);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error ||
        error.message ||
        'Authentication failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
            IF
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            IssueFlow<span className="text-indigo-600">.</span>
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {isLoginView
              ? 'Sign in to your team workspace'
              : 'Create your engineering account'}
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginView && (
            <div>
              <label
                htmlFor="auth-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>

              <input
                id="auth-name"
                type="text"
                required
                maxLength={100}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={isLoginView ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? 'Please wait...'
              : isLoginView
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLoginView((current) => !current);
              setErrorMessage('');
            }}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {isLoginView
              ? "Don't have an account? Sign up"
              : 'Already registered? Sign in'}
          </button>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;
