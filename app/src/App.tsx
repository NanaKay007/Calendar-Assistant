import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Login } from './components/Auth/Login';
import { Layout } from './components/Layout/Layout';
import { CalendarList } from './components/Calendar/CalendarList';
import { CalendarDetail } from './components/Calendar/CalendarDetail';
import { authService } from './services/authService';

/**
 * After Google OAuth, the backend redirects to /auth/success.
 * This component checks the session and redirects accordingly.
 */
function AuthCallback({ onAuth }: { onAuth: () => void }) {
  useEffect(() => {
    authService.isAuthenticated().then((ok) => {
      if (ok) onAuth();
    });
  }, [onAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService.isAuthenticated().then((authenticated) => {
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/calendars" replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route
          path="/auth/success"
          element={
            isAuthenticated ? (
              <Navigate to="/calendars" replace />
            ) : (
              <AuthCallback onAuth={handleLoginSuccess} />
            )
          }
        />
        <Route
          path="/auth/error"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/calendars" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/calendars"
          element={
            isAuthenticated ? (
              <Layout>
                <CalendarList />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/calendar/:calendarId"
          element={
            isAuthenticated ? (
              <Layout>
                <CalendarDetail />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* Redirect old /chat route to calendars — chat is now a collapsible panel */}
        <Route
          path="/chat"
          element={<Navigate to="/calendars" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
