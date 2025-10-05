import React, { useState, useEffect } from 'react';
import { API } from '../api/apiClient';
import { Card, Button, Input, Textarea, Modal, ConfirmDialog } from '../components/UI';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { excerptText } from '../utils/contentFormat';

function CourseManager() {
  const [courses, setCourses] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lessonData, setLessonData] = useState({ courseId: '', title: '', content: '' });
  const { getRoleRaw } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      const response = await API.myCourses(); 
      setCourses(response.data || []);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setError("Failed to load courses. Check console.");
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await API.createCourse({ title, description });
      setMessage(`Course '${response.data.title}' created (ID: ${response.data.id}). Status: ${response.data.status_name}`);
      setTitle('');
      setDescription('');
      fetchMyCourses();
    } catch (err) {
      const msg = err.response?.headers['x-idempotency-hit'] === 'true' 
                  ? 'Request already processed (Idempotency Hit).'
                  : (err.response?.data?.message || err.message);
      setError(`Creation Error: ${msg}`);
    }
  };
  // Modal edit flow
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorCourse, setEditorCourse] = useState(null);

  const openCourseEditor = (course) => {
    setEditorCourse({ ...course });
    setEditorOpen(true);
  };

  const saveCourseEdit = async () => {
    if(!editorCourse) return;
    try{
      const res = await API.updateCourse(editorCourse.id, { title: editorCourse.title, description: editorCourse.description });
      setMessage(`Course updated: ${res.data.title}`);
      setEditorOpen(false);
      setEditorCourse(null);
      fetchMyCourses();
    }catch(err){ setError(err.response?.data?.message || 'Failed to update course'); }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCourse, setPreviewCourse] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const requestDeleteCourse = (courseId) => {
    setConfirmTarget({ type: 'course', id: courseId });
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    if(!confirmTarget) return setConfirmOpen(false);
    try{
      if(confirmTarget.type === 'course'){
        await API.deleteCourse(confirmTarget.id);
        setMessage(`Course ${confirmTarget.id} deleted.`);
      }
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetchMyCourses();
    }catch(err){ setError(err.response?.data?.message || 'Failed to delete'); setConfirmOpen(false); }
  };

  const openCoursePreview = async (courseId) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError('');
    try{
      const res = await API.getCourse(courseId);
      setPreviewCourse(res.data);
    }catch(err){
      console.error('preview fetch error', err);
      setPreviewError(err.response?.data?.message || err.message || 'Failed to load preview');
    }finally{
      setPreviewLoading(false);
    }
  };
  
  const handleAddLesson = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    
    if (!lessonData.courseId) {
        setError("Please select a course.");
        return;
    }

    try {
      const response = await API.addLesson(lessonData.courseId, { title: lessonData.title, content: lessonData.content });
      setMessage(`Lesson '${response.data.title}' created (Order: ${response.data.order}) in Course ${lessonData.courseId}.`);
      setLessonData({ ...lessonData, title: '', content: '' });
      fetchMyCourses();
    } catch (err) {
      const details = err.response?.data?.details || err.response?.data || err.message;
      setError(`Lesson Error: ${JSON.stringify(details, null, 2)}`);
    }
  };
  
  return (
    <div>
      <h2>Course Management (Creator/Admin)</h2>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <h3 className="mt-20">Create New Course</h3>
      <Card className="mb-10">
        <form onSubmit={handleCreateCourse} className="form">
          <Input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} />
          <Button className="btn-primary" type="submit">Create Course (Idempotent Test)</Button>
        </form>
      </Card>

      <h3 className="mt-20">Add Lesson to Existing Course</h3>
      <Card className="mb-10">
        <form onSubmit={handleAddLesson} className="form">
          <select 
            value={lessonData.courseId} 
            onChange={(e) => setLessonData({ ...lessonData, courseId: e.target.value })} 
            required 
            className="form-input"
          >
            <option value="">-- Select Course (Draft Status) --</option>
            {courses.filter(c => c.status_name === 'Draft' || c.status_name === 'Pending Review').map(course => (
              <option key={course.id} value={course.id}>{course.title} (ID: {course.id})</option>
            ))}
          </select>
          <Input type="text" placeholder="Lesson Title" value={lessonData.title} onChange={(e) => setLessonData({ ...lessonData, title: e.target.value })} required />
          <Textarea placeholder="Lesson Content" value={lessonData.content} onChange={(e) => setLessonData({ ...lessonData, content: e.target.value })} required rows={3} />
          <Button type="submit" className="btn-primary" disabled={!lessonData.courseId}>Add Lesson</Button>
        </form>
      </Card>

      <h3 className="mt-20">My Courses Overview</h3>
      <div>
        {courses.map(course => (
          <Card key={course.id} className="mb-10">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                <strong>{course.title}</strong>
                <div className="muted">ID: {course.id} — Status: {course.status_name} — Lessons: {course.lesson_count}</div>
                <div className="muted">{excerptText(course.description)}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <Button onClick={() => navigate(`/courses/${course.id}`)}>Open</Button>
                {getRoleRaw() === 2 && (
                  <>
                    <Button onClick={() => openCourseEditor(course)}>Edit</Button>
                    <Button className="btn-danger" onClick={() => requestDeleteCourse(course.id)}>Delete</Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {/* Course Preview Modal (quick open without routing) */}
      <Modal title={previewCourse ? previewCourse.title : 'Course Preview'} isOpen={previewOpen} onClose={() => { setPreviewOpen(false); setPreviewCourse(null); setPreviewError(''); }}>
        {previewLoading && <div className="alert info">Loading...</div>}
        {previewError && <div className="alert error">{previewError}</div>}
        {previewCourse && (
          <div>
            <h3>{previewCourse.title}</h3>
            <div className="muted">{previewCourse.description}</div>
            <h4 className="mt-20">Lessons</h4>
            <ul className="list">
              {(previewCourse.lessons || []).map(l => (
                <li key={l.id} className="list-item">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <strong>{l.title}</strong>
                      <div className="muted">{l.summary || ''}</div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <Button onClick={() => {
                        // Open editor for lesson using the modal editor flow
                        setEditorCourse(previewCourse);
                        setEditorOpen(true);
                      }}>Edit Course</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
      {/* Editor Modal for course editing */}
      <Modal title={editorCourse ? 'Edit Course' : 'Edit'} isOpen={editorOpen} onClose={() => setEditorOpen(false)}>
        {editorCourse && (
          <div>
            <label>Title</label>
            <Input value={editorCourse.title} onChange={(e) => setEditorCourse({ ...editorCourse, title: e.target.value })} />
            <label style={{marginTop:12}}>Description</label>
            <Textarea value={editorCourse.description} onChange={(e) => setEditorCourse({ ...editorCourse, description: e.target.value })} rows={6} />
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
              <Button onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button className="btn-primary" onClick={saveCourseEdit}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        title="Delete Course"
        message="Delete this course? This action cannot be undone."
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={performDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}

export default CourseManager;