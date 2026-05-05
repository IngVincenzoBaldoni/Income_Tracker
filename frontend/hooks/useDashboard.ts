import { useState, useCallback } from 'react';
import api, { getErrorMessage } from '@/utils/api';
import type { YoYDataPoint, SalaryTimelinePoint } from '@/utils/calculations';

export interface DashboardMetrics {
  currentSalary: number;
  yearsInCareer: number;
  totalGrowthPercent: number;
  realGrowthPercent: number;
  yoyGrowthData: YoYDataPoint[];
  salaryTimeline: SalaryTimelinePoint[];
}

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<DashboardMetrics>('/dashboard/metrics');
      setMetrics(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { metrics, loading, error, fetchMetrics };
}
