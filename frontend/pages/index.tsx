import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPage() {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isLoggedIn) router.replace('/dashboard');
  }, [loading, isLoggedIn, router]);

  const features = [
    { icon: '📈', title: 'Salary timeline', desc: 'Visualize your entire compensation history in one clean chart.' },
    { icon: '📊', title: 'YoY growth', desc: 'See exactly how much you grew each year, and where you stalled.' },
    { icon: '💡', title: 'Real growth', desc: 'Adjust for inflation to know if you actually gained purchasing power.' },
    { icon: '🗂', title: 'Full history', desc: 'Log every role — company, title, salary, bonus, location.' },
  ];

  return (
    <>
      <Head>
        <title>Career Tracker — Track your salary growth</title>
        <meta name="description" content="Visualize your career salary progression, track real growth after inflation, and understand your compensation trajectory." />
      </Head>

      <div className="max-w-5xl mx-auto px-4 py-20">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 text-accent text-sm font-medium mb-6">
            Free to start · No credit card
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
            Track your career<br />
            <span className="text-accent">salary growth</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Log your salary history, visualize your progression over time, and see how your real purchasing power
            changed after inflation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="btn-primary text-lg py-3 px-8 inline-block">
              Get started for free
            </Link>
            <Link href="/auth/login" className="btn-secondary text-lg py-3 px-8 inline-block">
              Sign in
            </Link>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-20">
          {features.map((f) => (
            <div key={f.title} className="card hover:border-primary/40 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center card border-primary/30">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to see your trajectory?</h2>
          <p className="text-gray-400 mb-6">Takes 2 minutes to set up. Add your first job and see your chart instantly.</p>
          <Link href="/auth/signup" className="btn-primary text-base py-3 px-8 inline-block">
            Create your account
          </Link>
        </div>
      </div>
    </>
  );
}
