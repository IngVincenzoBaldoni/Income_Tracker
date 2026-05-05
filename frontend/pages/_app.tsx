import type { AppProps } from 'next/app';
import { AuthProvider } from '@/hooks/useAuth';
import Navbar from '@/components/Navigation/Navbar';
import ErrorBoundary from '@/components/Common/ErrorBoundary';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Component {...pageProps} />
          </main>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
