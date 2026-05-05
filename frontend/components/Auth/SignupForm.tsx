import { useState, FormEvent } from 'react';
import Link from 'next/link';
import api, { getErrorMessage } from '@/utils/api';
import LoadingSpinner from '@/components/Common/LoadingSpinner';

interface Props {
  onSignupSuccess: (email: string) => void;
}

export default function SignupForm({ onSignupSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/signup', { email, password });
      onSignupSuccess(email);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/40 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          placeholder="Min. 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted mt-1.5">Must contain uppercase, lowercase, number, and symbol</p>
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1.5">
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input-field"
          placeholder="Repeat your password"
          required
          autoComplete="new-password"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
        {loading ? <><LoadingSpinner size="sm" /> Creating account…</> : 'Create account'}
      </button>

      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-accent hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
