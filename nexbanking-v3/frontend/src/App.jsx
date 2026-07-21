import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import Login          from './pages/Login';
import Register       from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard      from './pages/Dashboard';
import Transactions   from './pages/Transactions';
import History        from './pages/History';
import Profile        from './pages/Profile';
import Beneficiaries  from './pages/Beneficiaries';
import Notifications  from './pages/Notifications';
import AIAssistant    from './pages/ai/AIAssistant';

import AdminDashboard    from './pages/admin/AdminDashboard';
import AdminUsers        from './pages/admin/AdminUsers';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminLogs         from './pages/admin/AdminLogs';

// Admin-only guard
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

const Wrap = ({ children, admin = false }) => (
  <ProtectedRoute>
    {admin
      ? <AdminRoute><AppLayout>{children}</AppLayout></AdminRoute>
      : <AppLayout>{children}</AppLayout>
    }
  </ProtectedRoute>
);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* User */}
          <Route path="/dashboard"     element={<Wrap><Dashboard /></Wrap>} />
          <Route path="/transactions"  element={<Wrap><Transactions /></Wrap>} />
          <Route path="/history"       element={<Wrap><History /></Wrap>} />
          <Route path="/beneficiaries" element={<Wrap><Beneficiaries /></Wrap>} />
          <Route path="/notifications" element={<Wrap><Notifications /></Wrap>} />
          <Route path="/ai"            element={<Wrap><AIAssistant /></Wrap>} />
          <Route path="/profile"       element={<Wrap><Profile /></Wrap>} />

          {/* Admin */}
          <Route path="/admin"              element={<Wrap admin><AdminDashboard /></Wrap>} />
          <Route path="/admin/users"        element={<Wrap admin><AdminUsers /></Wrap>} />
          <Route path="/admin/transactions" element={<Wrap admin><AdminTransactions /></Wrap>} />
          <Route path="/admin/logs"         element={<Wrap admin><AdminLogs /></Wrap>} />

          {/* Fallback */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
