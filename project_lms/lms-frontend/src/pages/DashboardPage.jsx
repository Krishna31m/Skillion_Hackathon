import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from '../components/UI';

export default function DashboardPage() {
  const { getRole, isAuthenticated } = useAuth();
  const role = isAuthenticated() ? getRole() : null;

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">Welcome to the LMS dashboard. Use the cards below to navigate.</p>

      {role ? (
        <div className="mt-20">
          <p>Signed in as: <strong>{role}</strong></p>
          <div className="gap-10 flex mt-20">
            {role === 'Learner' && (
              <>
                <Card><Link to="/enrollment">Browse Courses & Track Progress</Link></Card>
                <Card><Link to="/course-manager">Apply to be a Creator</Link></Card>
              </>
            )}
            {role === 'Creator' && (
              <Card><Link to="/course-manager">Manage/Create Courses & Lessons</Link></Card>
            )}
            {role === 'Admin' && (
              <>
                <Card><Link to="/admin-review">Review Creator Applications</Link></Card>
                <Card><Link to="/course-manager">Manage All Content</Link></Card>
              </>
            )}
          </div>
        </div>
      ) : (
        <p>Please log in to see personalized actions.</p>
      )}
    </div>
  );
}