import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import api, { getErrorMessage } from '@/utils/api';
import LoadingSpinner from '@/components/Common/LoadingSpinner';

interface Props {
  email: string;
}

export default function ConfirmEmail({ email }: Props) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/confirm', { email, code });
      router.push('/auth/login?confirmed=true');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 text-sm text-gray-300">
        A 6-digit confirmation code was sent to <strong className="text-white">{email}</strong>.
        Check your inbox (and spam folder).
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/40 text-danger rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-1.5">
            Confirmation code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            className="input-field text-center text-2xl tracking-[0.5em] font-mono"
            placeholder="000000"
            maxLength={6}
            required
            autoComplete="one-time-code"
          />
        </div>

        <button type="submit" disabled={loading || code.length < 6} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <><LoadingSpinner size="sm" /> Confirming…</> : 'Confirm email'}
        </button>
      </form>
    </div>
  );
}
