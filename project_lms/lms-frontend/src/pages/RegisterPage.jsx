// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API } from '../api/apiClient';
import { Card, Button, Input, Textarea } from '../components/UI';

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [role, setRole] = useState('Learner');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }

    try {
      // API.register accepts an optional role (1 = Learner, 2 = Creator)
      const payload = { username, email, password, password2, role: role === 'Creator' ? 2 : 1 };
      const response = await API.register(payload);

      const assignedRole = response.data.user?.role_name || (role === 'Creator' ? 'Creator' : 'Learner');
      setMessage(`Registration successful! Your role is ${assignedRole}. Redirecting to login...`);

      setTimeout(() => {
        navigate('/login');
      }, 1200);

    } catch (err) {
      console.error("Registration Error:", err);
      // Enhanced error handling for DRF validation messages
      const errorData = err.response?.data?.details || err.response?.data?.message || err.message;
      setError(typeof errorData === 'object' ? JSON.stringify(errorData, null, 2) : errorData);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '28px auto' }}>
      <Card>
        <h2>Register New Account</h2>
        <p className="muted">New accounts are registered as a <strong>Learner</strong> by default.</p>
        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error"><pre style={{margin:0}}>{error}</pre></div>}

        <form onSubmit={handleSubmit} className="form mt-20">
          <label>Register as</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="form-input">
            <option value="Learner">Learner</option>
            <option value="Creator">Creator</option>
          </select>

          <Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Input type="password" placeholder="Confirm Password" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
          <Button className="btn-primary" type="submit">Create Account</Button>
        </form>

        <p className="mt-20 muted">Already have an account? <Link to="/login">Login</Link></p>
      </Card>
    </div>
  );
}

export default RegisterPage;