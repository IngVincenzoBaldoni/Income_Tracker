import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/Auth/LoginForm';

export default function LoginPage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) router.replace('/dashboard');
  }, [isLoggedIn, router]);

  return (
    <>
      <Head><title>Sign in · Career Tracker</title></Head>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary mx-auto flex items-center justify-center text-white font-bold text-xl mb-4">CT</div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-gray-400 mt-1">Sign in to your Career Tracker account</p>
          </div>

          {router.query.confirmed && (
            <div className="bg-success/10 border border-success/40 text-success rounded-lg px-4 py-3 text-sm mb-4">
              Email confirmed! You can now sign in.
            </div>
          )}

          <div className="card">
            <LoginForm />
          </div>
        </div>
      </div>
    </>
  );
}
