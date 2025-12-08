import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workshops from './pages/Workshops';
import BeamDetails from './pages/BeamDetails';
import AddBeam from './pages/AddBeam';
import AddDelivery from './pages/AddDelivery';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ManageMachines from './pages/ManageMachines';
import AdminPanel from './pages/AdminPanel';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    setIsAdmin(!!token);
  }, []);

  const handleLogin = () => {
    setIsAdmin(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
  };

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Admin Login */}
          <Route path="/admin/login" element={<Login onLogin={handleLogin} />} />

          {/* Public & Admin Routes with Layout */}
          <Route path="/" element={<Layout isAdmin={isAdmin} onLogout={handleLogout} />}>
            <Route index element={<Dashboard />} />
            <Route path="workshops" element={<Workshops isAdmin={isAdmin} />} />
            <Route path="beams/:beamId" element={<BeamDetails isAdmin={isAdmin} />} />
            <Route path="reports" element={<Reports isAdmin={isAdmin} />} />

            {/* Admin Only Routes */}
            <Route
              path="add-beam"
              element={isAdmin ? <AddBeam /> : <Navigate to="/admin/login" />}
            />
            <Route
              path="add-delivery"
              element={isAdmin ? <AddDelivery /> : <Navigate to="/admin/login" />}
            />
            <Route
              path="settings"
              element={isAdmin ? <Settings /> : <Navigate to="/admin/login" />}
            />
            <Route
              path="manage-machines"
              element={isAdmin ? <ManageMachines /> : <Navigate to="/admin/login" />}
            />
            <Route
              path="admin-panel"
              element={isAdmin ? <AdminPanel /> : <Navigate to="/admin/login" />}
            />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;