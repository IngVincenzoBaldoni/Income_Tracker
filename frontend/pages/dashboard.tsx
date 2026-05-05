import Head from 'next/head';
import { useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/Navigation/ProtectedRoute';
import MetricsCards from '@/components/Dashboard/MetricsCards';
import SalaryChart from '@/components/Dashboard/SalaryChart';
import YoYChart from '@/components/Dashboard/YoYChart';
import JobsList from '@/components/Dashboard/JobsList';
import LoadingSpinner from '@/components/Common/LoadingSpinner';
import { useDashboard } from '@/hooks/useDashboard';

function DashboardContent() {
  const { metrics, loading, error, fetchMetrics } = useDashboard();

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const handleDataChange = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Your career compensation overview</p>
        </div>
      </div>

      {loading && !metrics ? (
        <LoadingSpinner size="lg" className="py-16" />
      ) : error ? (
        <div className="bg-danger/10 border border-danger/40 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      ) : metrics ? (
        <>
          <MetricsCards
            currentSalary={metrics.currentSalary}
            yearsInCareer={metrics.yearsInCareer}
            totalGrowthPercent={metrics.totalGrowthPercent}
            realGrowthPercent={metrics.realGrowthPercent}
          />

          {metrics.salaryTimeline.length > 0 && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                  <SalaryChart data={metrics.salaryTimeline} />
                </div>
                <div className="lg:col-span-2">
                  <YoYChart data={metrics.yoyGrowthData} />
                </div>
              </div>

              {metrics.totalGrowthPercent > 0 && (
                <div className="bg-background-card border border-gray-700/50 rounded-xl px-5 py-4 text-sm text-gray-300 flex items-start gap-3">
                  <span className="text-accent text-lg leading-none mt-0.5">💡</span>
                  <span>
                    Your salary grew <strong className="text-white">{metrics.totalGrowthPercent}%</strong> nominally,
                    but <strong className={metrics.realGrowthPercent >= 0 ? 'text-success' : 'text-danger'}>
                      {metrics.realGrowthPercent >= 0 ? '+' : ''}{metrics.realGrowthPercent}%
                    </strong> in real terms after inflation.
                    {metrics.realGrowthPercent < 0
                      ? ' You lost purchasing power — your salary didn\'t keep up with price increases.'
                      : ' Great — your purchasing power genuinely grew.'}
                  </span>
                </div>
              )}
            </>
          )}

          <JobsList onDataChange={handleDataChange} />
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-4">No data yet</p>
          <p className="text-muted text-sm">Add salary entries below to see your dashboard</p>
          <div className="mt-8">
            <JobsList onDataChange={handleDataChange} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Head><title>Dashboard · Career Tracker</title></Head>
      <ProtectedRoute>
        <DashboardContent />
      </ProtectedRoute>
    </>
  );
}
