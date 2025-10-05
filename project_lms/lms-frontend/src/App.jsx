// src/App.jsx

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; 
import DashboardPage from './pages/DashboardPage';
import AdminReviewPage from './pages/AdminReviewPage';
import CourseManager from './pages/CourseManager';
import EnrollmentPage from './pages/EnrollmentPage'; // NEW
import CourseDetail from './pages/CourseDetail';
import Navbar from './components/Navbar';

// Component to handle redirection if not authenticated
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

function App() {
  const { isAuthenticated, getRole, restoreSession } = useAuth();
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await restoreSession();
      } finally {
        if (mounted) setRestoring(false);
      }
    })();
    return () => { mounted = false; };
  }, [restoreSession]);

  return (
    <Router>
      <div>
        <Navbar />
        <div className="app-container">
        {restoring && <div style={{ padding: 20 }}>Restoring session...</div>}
        {!restoring && (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Core Protected Routes */}
          <Route path="/dashboard" element={ <ProtectedRoute><DashboardPage /></ProtectedRoute> } />
          <Route path="/enrollment" element={ <ProtectedRoute><EnrollmentPage /></ProtectedRoute> } />
          <Route path="/courses/:id" element={ <ProtectedRoute><CourseDetail /></ProtectedRoute> } />
          
          {/* Role-Specific Protected Routes */}
          <Route path="/course-manager" element={ <ProtectedRoute><CourseManager /></ProtectedRoute> } />
          <Route path="/admin-review" element={ <ProtectedRoute><AdminReviewPage /></ProtectedRoute> } />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<h1>404 - Not Found</h1>} />
        </Routes>
        )}
        </div>
      </div>
    </Router>
  );
}

export default App;