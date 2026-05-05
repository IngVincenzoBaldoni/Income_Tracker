import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/api';
import LoadingSpinner from '@/components/Common/LoadingSpinner';

export default function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.toLowerCase().includes('not confirmed')) {
        router.push(`/auth/signup?confirm=${encodeURIComponent(email)}`);
      } else {
        setError(msg);
      }
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
          placeholder="Your password"
          required
          autoComplete="current-password"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
        {loading ? <><LoadingSpinner size="sm" /> Signing in…</> : 'Sign in'}
      </button>

      <p className="text-center text-sm text-gray-400">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-accent hover:underline font-medium">
          Create one
        </Link>
      </p>
    </form>
  );
}
