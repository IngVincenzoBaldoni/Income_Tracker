import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';
import JobForm from '@/components/Jobs/JobForm';
import LoadingSpinner from '@/components/Common/LoadingSpinner';

export default function OnboardingPage() {
  const { isLoggedIn, loading: authLoading, user } = useAuth();
  const { createJob, fetchJobs, jobs, loading: jobsLoading } = useJobs();
  const router = useRouter();
  const [step, setStep] = useState<'loading' | 'welcome' | 'add-job' | 'done'>('loading');

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.replace('/auth/login'); return; }

    fetchJobs().then(() => {
      setStep('welcome');
    });
  }, [authLoading, isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 'welcome' && jobs.length > 0) {
      router.replace('/dashboard');
    }
  }, [step, jobs.length, router]);

  const handleSubmit = async (payload: any) => {
    await createJob(payload);
    setStep('done');
    setTimeout(() => router.push('/dashboard'), 1200);
  };

  if (step === 'loading' || authLoading || jobsLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <>
      <Head><title>Get started · Career Tracker</title></Head>
      <div className="max-w-2xl mx-auto px-4 py-16">
        {step === 'done' ? (
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">You&apos;re all set!</h2>
            <p className="text-gray-400">Redirecting to your dashboard…</p>
          </div>
        ) : step === 'welcome' ? (
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-3">
              Welcome{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Let&apos;s start by adding your first salary entry. You can always add more from the dashboard.
            </p>
            <div className="card text-left">
              <h2 className="text-white font-semibold text-lg mb-5">Add your first job</h2>
              <JobForm onSubmit={handleSubmit} onCancel={() => router.push('/dashboard')} />
            </div>
          </div>
        ) : (
          <div className="card">
            <h2 className="text-white font-semibold text-lg mb-5">Add your first job</h2>
            <JobForm onSubmit={handleSubmit} onCancel={() => router.push('/dashboard')} />
          </div>
        )}
      </div>
    </>
  );
}
