// src/pages/EnrollmentPage.jsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API } from '../api/apiClient';
import { Card, Button } from '../components/UI';
import { excerptText } from '../utils/contentFormat';

function EnrollmentPage() {
  const [availableCourses, setAvailableCourses] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetchAvailableCourses();
    fetchEnrollments();
  };

  const fetchAvailableCourses = async () => {
    try {
      const res = await API.listCourses();
      const results = res.data.results || [];
      const grouped = results.reduce((acc, course) => {
        const key = course.creator_username || 'Unknown Creator';
        if (!acc[key]) acc[key] = [];
        acc[key].push(course);
        return acc;
      }, {});
      setAvailableCourses(grouped);
    } catch (err) {
      setError('Could not load courses.');
    }
  };

  const fetchEnrollments = async () => {
    try {
      const res = await API.listEnrollments();
      setEnrollments(res.data.results || []);
    } catch (err) {
      setEnrollments([]);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      await API.enroll(courseId);
      setMessage(`Successfully enrolled in course ID ${courseId}.`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Enrollment failed.');
    }
  };

  const handleMarkComplete = async (courseId, lessonId) => {
  try {
    const enrollment = enrollments.find(e => e.course === courseId);
    if (!enrollment) return;
        
    // API expects courseId in URL, backend will find the enrollment for the current user
    await API.markLessonComplete(courseId, lessonId);
    setMessage(`Lesson ${lessonId} marked complete!`);
    fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Marking lesson complete failed.');
    }
  };

  const handleIssueCertificate = async (enrollmentId) => {
    try {
      const res = await API.issueCertificate(enrollmentId);
      setMessage(`Certificate issued! Hash: ${res.data.certificate.serial_hash}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to issue certificate. Course completed?');
    }
  };

  const isEnrolled = (courseId) => enrollments.some(e => e.course === courseId);

  return (
    <div>
      <h2>Learner Enrollment Hub</h2>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <h3 className="mt-20">Courses Available</h3>
      {Object.keys(availableCourses).length === 0 ? (
        <p>No courses available yet.</p>
      ) : (
        Object.entries(availableCourses).map(([creatorName, courses]) => (
          <Card key={creatorName} className="mb-10">
            <h4>{creatorName}</h4>
            <ul className="list">
              {courses.map(course => (
                <li key={course.id} className="list-item">
                  <div className="flex" style={{justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <strong><Link to={`/courses/${course.id}`}>{course.title}</Link></strong>
                      <div className="muted">{excerptText(course.description)}</div>
                    </div>
                    <div>
                      {isEnrolled(course.id) ? (
                        <span className="muted">ENROLLED</span>
                      ) : (
                        <Button className="btn-primary" onClick={() => handleEnroll(course.id)}>Enroll</Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}

      <h3 className="mt-20">My Enrollments ({enrollments.length})</h3>
      <div>
        {enrollments.map(enrollment => (
          <Card key={enrollment.id} className="mb-10">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <strong>{enrollment.course_title}</strong>
                <div className="muted">Enrollment ID: {enrollment.id}</div>
              </div>
              <div>
                <div style={{color: enrollment.is_completed ? 'var(--success)' : 'orange'}}>
                  {enrollment.is_completed ? 'Completed 🎉' : 'In Progress'}
                </div>
              </div>
            </div>

            <div className="mt-20">
              <div className="muted">Mock Lesson Progress</div>
                <div className="gap-10 flex mt-20">
                {/* <Button onClick={() => navigate(`/courses/${enrollment.course}`)}></Button> */}
                {enrollment.is_completed && !enrollment.certificate && (
                  <Button className="btn-primary" onClick={() => handleIssueCertificate(enrollment.id)}>Issue Certificate</Button>
                )}
                {enrollment.certificate && (
                  <div className="muted">
                    <div>Certificate: {enrollment.certificate.serial_hash.substring(0,10)}...</div>
                    <div style={{marginTop:8}}>
                      <a className="btn btn-primary" href={`${import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'}/enrollment/certificate/pdf/${enrollment.certificate.serial_hash}`} target="_blank" rel="noreferrer">Download PDF</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default EnrollmentPage;