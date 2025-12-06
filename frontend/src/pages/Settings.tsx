import { useState } from 'react';
import { Link } from 'react-router-dom';
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
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your admin account settings</p>
      </div>

      {/* Password Reset Section */}
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
            <p className="text-sm text-gray-600">Change your admin account password</p>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={passwordData.username}
              onChange={(e) => setPasswordData({ ...passwordData, username: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Enter new password"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
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

      {/* System Information */}
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold mb-4">System Management</h3>
        <div className="space-y-3">
          <Link
            to="/manage-machines"
            className="flex items-center justify-between py-3 px-4 bg-primary-50 hover:bg-primary-100 rounded-xl transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">⚙️</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Manage Machines</p>
                <p className="text-sm text-gray-600">Add, edit, or remove machines</p>
              </div>
            </div>
            <span className="text-primary-600 font-semibold">→</span>
          </Link>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold mb-4">System Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Application</span>
            <span className="font-semibold text-gray-900">Powerloom Dashboard v1.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Database</span>
            <span className="font-semibold text-gray-900">MySQL</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Backend</span>
            <span className="font-semibold text-gray-900">FastAPI (Python)</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Frontend</span>
            <span className="font-semibold text-gray-900">React + TypeScript</span>
          </div>
        </div>
      </div>

      {/* Help & Support */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
        <p className="text-gray-700 mb-4">
          If you encounter any issues or need assistance with the dashboard, please contact support.
        </p>
        <div className="flex space-x-4">
          <div className="bg-white rounded-xl px-4 py-2 text-sm">
            <span className="text-gray-600">Email:</span>{' '}
            <span className="font-semibold text-gray-900">support@powerloom.com</span>
          </div>
          <div className="bg-white rounded-xl px-4 py-2 text-sm">
            <span className="text-gray-600">Phone:</span>{' '}
            <span className="font-semibold text-gray-900">+91 98765 43210</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;