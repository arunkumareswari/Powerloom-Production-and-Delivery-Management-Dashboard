import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Factory, FileText, Settings, LogOut, Lock, Plus, Package, Sliders } from 'lucide-react';

interface LayoutProps {
  isAdmin: boolean;
  onLogout: () => void;
}

const Layout = ({ isAdmin, onLogout }: LayoutProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-soft sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Powerloom Dashboard</h1>
                <p className="text-xs text-gray-500">Production Management</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isAdmin ? (
                <>
                  <span className="text-sm text-gray-600 bg-green-100 px-3 py-1 rounded-full">
                    Admin Mode
                  </span>
                  <button
                    onClick={onLogout}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/admin/login"
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-xl transition"
                >
                  <Lock className="w-4 h-4" />
                  <span>Admin Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar - Floating Panel */}
        <aside className="w-64 bg-white shadow-lg min-h-screen sticky top-16 self-start mt-2 ml-2 mb-2 rounded-2xl">
          <nav className="p-4 space-y-2">
            <Link
              to="/"
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/')}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>

            <Link
              to="/workshops"
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/workshops')}`}
            >
              <Factory className="w-5 h-5" />
              <span className="font-medium">Workshops</span>
            </Link>

            <Link
              to="/reports"
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/reports')}`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Reports</span>
            </Link>

            {isAdmin && (
              <>
                <div className="border-t border-gray-200 my-4"></div>
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase">Admin Actions</p>

                <Link
                  to="/add-beam"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/add-beam')}`}
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Add Beam</span>
                </Link>

                <Link
                  to="/add-delivery"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/add-delivery')}`}
                >
                  <Package className="w-5 h-5" />
                  <span className="font-medium">Add Delivery</span>
                </Link>

                <Link
                  to="/admin-panel"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/admin-panel')}`}
                >
                  <Sliders className="w-5 h-5" />
                  <span className="font-medium">Manage</span>
                </Link>

                <Link
                  to="/settings"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/settings')}`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </Link>
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;