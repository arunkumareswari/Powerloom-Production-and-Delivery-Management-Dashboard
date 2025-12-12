import { useState } from 'react';
import { authAPI } from '../services/api';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [passwordData, setPasswordData] = useState({
    username: 'admin',
    new_password: '',
    confirm_password: '',
  });

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword(passwordData.username, passwordData.new_password);
      setSuccess('Password reset successfully!');
      setPasswordData({ ...passwordData, new_password: '', confirm_password: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">Manage your admin account settings</p>
      </div>

      {/* Password Reset Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reset Password</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Change your admin account password</p>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={passwordData.username}
              onChange={(e) => setPasswordData({ ...passwordData, username: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Enter new password"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Re-enter new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition font-semibold disabled:opacity-50"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>


      {/* Danger Zone - Reset Database */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft border-2 border-red-200 dark:border-red-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Danger Zone</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Irreversible actions</p>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-800 dark:text-orange-300 font-semibold mb-2">⚠️ Warning: This action cannot be undone!</p>
          <p className="text-sm text-red-700 dark:text-red-300">
            Resetting the database will permanently delete ALL data including:
          </p>
          <ul className="text-sm text-red-700 dark:text-red-300 mt-2 ml-4 list-disc space-y-1">
            <li>All beams and deliveries</li>
            <li>All workshops, customers, and machines</li>
            <li>All design presets and production history</li>
            <li>Everything except admin credentials</li>
          </ul>
        </div>

        <button
          onClick={() => {
            const modal = document.getElementById('reset-modal');
            if (modal) modal.classList.remove('hidden');
          }}
          className="w-full px-6 py-3 bg-red-600 dark:bg-red-700 text-white rounded-xl hover:bg-red-700 dark:hover:bg-red-600 transition font-semibold"
        >
          Reset Database
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      <div id="reset-modal" className="hidden fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/60" onClick={() => {
          document.getElementById('reset-modal')?.classList.add('hidden');
          setError('');
        }}></div>

        {/* Modal Content */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Database Reset</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Enter admin password to proceed</p>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
            <p className="text-xs text-red-800 dark:text-red-300 font-semibold">This will delete ALL data permanently!</p>
          </div>

          {/* Error message in modal */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-4 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Success message in modal */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 mb-4 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-xs text-green-700 dark:text-green-300">{success}</p>
            </div>
          )}

          <form onSubmit={async (e) => {
            e.preventDefault();
            const password = (document.getElementById('reset-password') as HTMLInputElement).value;

            try {
              setLoading(true);
              setError('');
              setSuccess('');

              // Call reset API
              const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/reset-database`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                },
                body: JSON.stringify({ admin_password: password })
              });

              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to reset database');
              }

              setSuccess('Database reset successfully! All data has been deleted.');
              (document.getElementById('reset-password') as HTMLInputElement).value = '';

              // Auto close after 2 seconds on success
              setTimeout(() => {
                const modal = document.getElementById('reset-modal');
                if (modal) modal.classList.add('hidden');
                setSuccess('');
              }, 2000);
            } catch (err: any) {
              setError(err.message || 'Failed to reset database');
            } finally {
              setLoading(false);
            }
          }} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Admin Password <span className="text-red-500">*</span>
              </label>
              <input
                id="reset-password"
                type="password"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Enter admin password"
                required
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  const modal = document.getElementById('reset-modal');
                  if (modal) modal.classList.add('hidden');
                  (document.getElementById('reset-password') as HTMLInputElement).value = '';
                  setError('');
                  setSuccess('');
                }}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Database'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;