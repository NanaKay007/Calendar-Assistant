import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Login } from './components/Auth/Login';
import { Layout } from './components/Layout/Layout';
import { CalendarList } from './components/Calendar/CalendarList';
import { CalendarDetail } from './components/Calendar/CalendarDetail';
import { ChatInterface } from './components/Chat/ChatInterface';
import { authService } from './services/authService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    };

    checkAuth();
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
        <Route
          path="/chat"
          element={
            isAuthenticated ? (
              <Layout>
                <div className="h-[calc(100vh-10rem)] bg-white rounded-lg shadow-md overflow-hidden">
                  <ChatInterface />
                </div>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
