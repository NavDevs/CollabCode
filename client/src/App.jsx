import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import History from './pages/History';
import EditorPage from './pages/EditorPage';
import Profile from './pages/Profile';
import AuthCallback from './pages/AuthCallback';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Encode the intended path as a query param so it survives any navigation
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public landing page — always accessible */}
      <Route path="/" element={<Landing />} />

      {/* Login/Register are NOT wrapped — they handle auth redirect internally */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Google OAuth callback — public, handles token storage */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/editor/:roomId" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* Catch-all → landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#121224',
                color: '#F1F5F9',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              },
              success: { iconTheme: { primary: '#34D399', secondary: '#121224' } },
              error:   { iconTheme: { primary: '#F43F5E', secondary: '#121224' } },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
