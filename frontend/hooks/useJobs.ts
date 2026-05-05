import { useState, useCallback } from 'react';
import api, { getErrorMessage } from '@/utils/api';
import type { Job } from '@/utils/calculations';

interface CreateJobPayload {
  company: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  baseSalary: number;
  bonus?: number;
  location: string;
  currency?: string;
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Job[]>('/jobs');
      setJobs(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const createJob = async (payload: CreateJobPayload): Promise<void> => {
    await api.post('/jobs', payload);
    await fetchJobs();
  };

  const updateJob = async (jobId: string, payload: CreateJobPayload): Promise<void> => {
    await api.put(`/jobs/${jobId}`, payload);
    await fetchJobs();
  };

  const deleteJob = async (jobId: string): Promise<void> => {
    await api.delete(`/jobs/${jobId}`);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  return { jobs, loading, error, fetchJobs, createJob, updateJob, deleteJob };
}
