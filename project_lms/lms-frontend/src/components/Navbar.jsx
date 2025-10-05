import React from 'react';
import { getRoleInfo, clearAuthTokens } from '../utils/auth';
import { Button } from './UI';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
  // useLocation causes Navbar to re-render on route changes
  const location = useLocation();
  const { role, role_name } = getRoleInfo();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthTokens();
    // navigate to login; Navbar will re-render because location changes
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="brand"><Link to="/" className="brand">LMS</Link></div>
      <div className="nav-links">
        {role ? (
          <>
            <span className="muted">Role: {role_name || role}</span>
            <Button className="btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</Button>
            <Button className="btn-ghost" onClick={handleLogout}>Logout</Button>
          </>
        ) : (
          <>
            <Link to="/login" className="muted">Login</Link>
            <Link to="/register" className="muted">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;
