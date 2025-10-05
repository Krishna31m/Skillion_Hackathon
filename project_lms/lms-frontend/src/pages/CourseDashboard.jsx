// src/pages/CourseDashboard.jsx

import React, { useState } from 'react';
import { API } from '../api/apiClient';

function CourseDashboard() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
      const response = await API.createCourse({ title, description });
      setMessage(`Course '${response.data.title}' created successfully (ID: ${response.data.id}). Status: ${response.data.status_name}`);
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error(err);
      setMessage(
        `Error: ${err.response?.data?.message || err.message}. 
         Ensure you are logged in as a Creator/Admin.`
      );
    }
  };
  
  // Simple Logout functionality
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Creator/Admin Dashboard</h2>
        <button onClick={handleLogout} style={{ padding: '5px 10px', cursor: 'pointer' }}>Logout</button>
      </div>

      <hr style={{ margin: '20px 0' }} />

      <h3>Create New Course</h3>
      {message && <p style={{ margin: '15px 0', padding: '10px', backgroundColor: message.startsWith('Error') ? '#fdd' : '#dfd' }}>{message}</p>}
      
      <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="text"
          placeholder="Course Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ padding: '10px' }}
        />
        <textarea
          placeholder="Course Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows="5"
          style={{ padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white' }}>
          Create Course
        </button>
      </form>
    </div>
  );
}

export default CourseDashboard;