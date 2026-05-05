import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import SignupForm from '@/components/Auth/SignupForm';
import ConfirmEmail from '@/components/Auth/ConfirmEmail';

export default function SignupPage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) { router.replace('/dashboard'); return; }
    // Allow direct jump to confirm step via query param (e.g. redirected from login)
    const confirmEmail = router.query.confirm as string | undefined;
    if (confirmEmail) setPendingEmail(confirmEmail);
  }, [isLoggedIn, router, router.query.confirm]);

  return (
    <>
      <Head><title>Sign up · Career Tracker</title></Head>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary mx-auto flex items-center justify-center text-white font-bold text-xl mb-4">CT</div>
            <h1 className="text-2xl font-bold text-white">
              {pendingEmail ? 'Confirm your email' : 'Create your account'}
            </h1>
            <p className="text-gray-400 mt-1">
              {pendingEmail ? 'Enter the 6-digit code we sent you' : 'Start tracking your career today'}
            </p>
          </div>

          <div className="card">
            {pendingEmail ? (
              <ConfirmEmail email={pendingEmail} />
            ) : (
              <SignupForm onSignupSuccess={(email) => setPendingEmail(email)} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
