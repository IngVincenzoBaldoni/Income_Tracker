import { useState, useEffect, FormEvent } from 'react';
import type { Job } from '@/utils/calculations';
import { getErrorMessage } from '@/utils/api';
import LoadingSpinner from '@/components/Common/LoadingSpinner';

interface JobPayload {
  company: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  baseSalary: number;
  bonus: number;
  location: string;
  currency: string;
}

interface Props {
  job?: Job | null;
  onSubmit: (payload: JobPayload) => Promise<void>;
  onCancel: () => void;
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK'];

export default function JobForm({ job, onSubmit, onCancel }: Props) {
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [bonus, setBonus] = useState('0');
  const [location, setLocation] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (job) {
      setCompany(job.company);
      setJobTitle(job.jobTitle);
      setStartDate(job.startDate?.toString().slice(0, 10) ?? '');
      setEndDate(job.endDate?.toString().slice(0, 10) ?? '');
      setBaseSalary(String(job.baseSalary));
      setBonus(String(job.bonus));
      setLocation(job.location);
      setCurrency(job.currency);
    }
  }, [job]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSubmit({
        company,
        jobTitle,
        startDate,
        endDate: endDate || undefined,
        baseSalary: Number(baseSalary),
        bonus: Number(bonus),
        location,
        currency,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = 'input-field';
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/40 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Company</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={fieldClass} placeholder="Acme Corp" required />
        </div>
        <div>
          <label className={labelClass}>Job title</label>
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={fieldClass} placeholder="Software Engineer" required />
        </div>
        <div>
          <label className={labelClass}>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldClass} required />
        </div>
        <div>
          <label className={labelClass}>End date <span className="text-muted">(leave blank if current)</span></label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={fieldClass} min={startDate} />
        </div>
        <div>
          <label className={labelClass}>Base salary (annual)</label>
          <input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} className={fieldClass} placeholder="50000" min="1" required />
        </div>
        <div>
          <label className={labelClass}>Bonus (annual)</label>
          <input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} className={fieldClass} placeholder="0" min="0" />
        </div>
        <div>
          <label className={labelClass}>Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass} placeholder="Milan, Italy" required />
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={fieldClass}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <><LoadingSpinner size="sm" /> Saving…</> : job ? 'Save changes' : 'Add entry'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
