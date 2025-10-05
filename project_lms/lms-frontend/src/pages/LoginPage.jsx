// src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API } from '../api/apiClient';
import { setAuthTokens, setRoleInfo } from '../utils/auth';
import { Card, Button, Input } from '../components/UI';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await API.login({ username, password });

      // Store tokens and role info in local storage
      setAuthTokens(response.data.access, response.data.refresh);
      if (response.data.role !== undefined) {
        setRoleInfo(response.data.role, response.data.role_name || '');
      }

      // Navigate to the dashboard or profile
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Login failed. Check credentials.');
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '28px auto' }}>
      <Card>
        <h2 className="mb-10">Sign in to your account</h2>
        {error && <div className="alert error mb-10">{error}</div>}
        <form onSubmit={handleSubmit} className="form">
          <Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button className="btn-primary" type="submit">Login</Button>
        </form>
          <p className="mt-20 muted">Don't have an account? <Link to="/register">Register</Link></p>
      </Card>
    </div>
  );
}

export default LoginPage;