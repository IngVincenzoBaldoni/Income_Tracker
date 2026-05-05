import Head from 'next/head';
import { useState, FormEvent } from 'react';
import ProtectedRoute from '@/components/Navigation/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import api, { getErrorMessage } from '@/utils/api';
import LoadingSpinner from '@/components/Common/LoadingSpinner';

function ProfileContent() {
  const { user, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNew, setConfirmNew] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (newPassword !== confirmNew) {
      setPwError('New passwords do not match');
      return;
    }

    setPwLoading(true);
    try {
      await api.put('/auth/password', { oldPassword, newPassword });
      setPwSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmNew('');
    } catch (err) {
      setPwError(getErrorMessage(err));
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile & Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Manage your account details</p>
      </div>

      {/* Account info */}
      <div className="card space-y-4">
        <h2 className="text-white font-semibold">Account info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-muted text-xs font-medium uppercase tracking-wider mb-1">Email</p>
            <p className="text-white">{user?.email}</p>
          </div>
          <div>
            <p className="text-muted text-xs font-medium uppercase tracking-wider mb-1">Member since</p>
            <p className="text-white">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <h2 className="text-white font-semibold mb-4">Change password</h2>

        {pwSuccess && (
          <div className="bg-success/10 border border-success/40 text-success rounded-lg px-4 py-3 text-sm mb-4">
            Password changed successfully.
          </div>
        )}
        {pwError && (
          <div className="bg-danger/10 border border-danger/40 text-danger rounded-lg px-4 py-3 text-sm mb-4">
            {pwError}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Current password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="input-field"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmNew}
              onChange={(e) => setConfirmNew(e.target.value)}
              className="input-field"
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={pwLoading} className="btn-primary flex items-center gap-2">
            {pwLoading ? <><LoadingSpinner size="sm" /> Updating…</> : 'Update password'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card border-danger/20">
        <h2 className="text-white font-semibold mb-3">Sign out</h2>
        <p className="text-gray-400 text-sm mb-4">You&apos;ll be returned to the login page.</p>
        <button onClick={logout} className="btn-danger">Sign out</button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <>
      <Head><title>Profile · Career Tracker</title></Head>
      <ProtectedRoute>
        <ProfileContent />
      </ProtectedRoute>
    </>
  );
}
