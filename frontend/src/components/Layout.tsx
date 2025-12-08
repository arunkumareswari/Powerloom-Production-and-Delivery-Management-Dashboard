import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Factory, FileText, Settings, LogOut, Lock, Plus, Package, Sliders, Menu, X } from 'lucide-react';

interface LayoutProps {
  isAdmin: boolean;
  onLogout: () => void;
}

const Layout = ({ isAdmin, onLogout }: LayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100';
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-soft sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 md:h-16">
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Hamburger Menu Button - Mobile Only */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <Factory className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold text-gray-900">Powerloom Dashboard</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Production Management</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              {isAdmin ? (
                <>
                  <span className="text-xs md:text-sm text-gray-600 bg-green-100 px-2 md:px-3 py-1 rounded-full hidden sm:inline">
                    Admin Mode
                  </span>
                  <button
                    onClick={onLogout}
                    className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 text-xs md:text-sm text-red-600 hover:bg-red-50 rounded-xl transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/admin/login"
                  className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 text-xs md:text-sm text-primary-600 hover:bg-primary-50 rounded-xl transition"
                >
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex relative">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed md:sticky top-14 md:top-16 left-0 h-[calc(100vh-56px)] md:h-[calc(100vh-64px)]
          w-64 bg-white shadow-lg z-40
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:ml-2 md:mt-2 md:mb-2 md:rounded-2xl md:min-h-screen md:self-start
        `}>
          <nav className="p-4 space-y-2">
            <Link
              to="/"
              onClick={closeSidebar}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/')}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>

            <Link
              to="/workshops"
              onClick={closeSidebar}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/workshops')}`}
            >
              <Factory className="w-5 h-5" />
              <span className="font-medium">Workshops</span>
            </Link>

            <Link
              to="/reports"
              onClick={closeSidebar}
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
                  onClick={closeSidebar}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/add-beam')}`}
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Add Beam</span>
                </Link>

                <Link
                  to="/add-delivery"
                  onClick={closeSidebar}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/add-delivery')}`}
                >
                  <Package className="w-5 h-5" />
                  <span className="font-medium">Add Delivery</span>
                </Link>

                <Link
                  to="/admin-panel"
                  onClick={closeSidebar}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${isActive('/admin-panel')}`}
                >
                  <Sliders className="w-5 h-5" />
                  <span className="font-medium">Manage</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={closeSidebar}
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
        <main className="flex-1 p-3 md:p-6 min-w-0">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;