import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../api/apiClient';
import { Card, Button, Input, Textarea, Modal, ConfirmDialog } from '../components/UI';
import { useAuth } from '../hooks/useAuth';
import { formatContent } from '../utils/contentFormat';

// CourseDetail page shows lessons, content, and allows marking lessons complete.
export default function CourseDetail(){
  const { id } = useParams(); // course id
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { getRoleRaw } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorItem, setEditorItem] = useState(null); // { type: 'lesson'|'course', id, title, content }
  const [editorSaving, setEditorSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const openLessonEditor = (lesson) => {
    setError('');
    setEditorItem({ type: 'lesson', id: lesson.id, title: lesson.title, content: lesson.content || lesson.body || '' });
    setEditorOpen(true);
  };

  const openCourseEditor = () => {
    if (!course) return;
    setError('');
    setEditorItem({ type: 'course', id: course.id, title: course.title, content: course.description || '' });
    setEditorOpen(true);
  };

  const closeEditor = () => { setEditorOpen(false); setEditorItem(null); };

  const saveEditor = async () => {
    if (!editorItem) return;
    setEditorSaving(true);
    try{
      if (editorItem.type === 'lesson'){
        const payload = { title: editorItem.title, content: editorItem.content };
        console.log('Updating lesson', course.id, editorItem.id, payload);
        await API.updateLesson(course.id, editorItem.id, payload);
        setMessage('Lesson saved');
        await fetchCourse();
      } else if (editorItem.type === 'course'){
        const payload = { title: editorItem.title, description: editorItem.content };
        console.log('Updating course', editorItem.id, payload);
        await API.updateCourse(editorItem.id, payload);
        setMessage('Course saved');
        await fetchCourse();
      }
      closeEditor();
    }catch(err){ 
      console.error('Save editor error:', err);
      const details = err.response?.data || err.message;
      setError(typeof details === 'object' ? JSON.stringify(details, null, 2) : details);
    } finally {
      setEditorSaving(false);
    }
  };

  useEffect(()=>{
    if (!id) {
      setError('No course id provided in the URL.');
      return;
    }
    // fetch profile first so ownership can be determined when course loads
    (async () => {
      await fetchProfile();
      await fetchCourse();
      await fetchEnrollments();
    })();
  },[id]);

  const fetchCourse = async ()=>{
    setLoading(true);
    setDebugInfo(null);
    try{
      const res = await API.getCourse(id);
      const found = res.data;
      setCourse(found);
      const remoteLessons = found.lessons || [];
      const sampleLessons = [
        { id: '1', title: 'Introduction to DSA', summary: 'Overview of Data Structures and Algorithms', content: '<p>DSA stands for Data Structures and Algorithms...</p>' },
        { id: '2', title: 'Arrays and Linked Lists', summary: 'Basic linear data structures', content: '<p>Arrays store items contiguously. Linked lists store nodes...</p>' },
        { id: '3', title: 'Stacks and Queues', summary: 'LIFO and FIFO structures', content: '<p>Stacks are LIFO. Queues are FIFO...</p>' },
      ];
      const finalLessons = (remoteLessons && remoteLessons.length) ? remoteLessons : sampleLessons;
      setLessons(finalLessons);
      setSelectedLesson(finalLessons[0] || null);
      // compute ownership if profile known
      try{
        const creatorId = found?.creator || found?.creator_id || found?.creator?.id || null;
        if (profile && creatorId != null) {
          const isAdmin = profile.role === 3 || (profile.role_name && String(profile.role_name).toLowerCase() === 'admin');
          setIsOwner(String(profile.id) === String(creatorId) || isAdmin);
        }
      }catch(e){ /* ignore ownership detection errors */ }
    }catch(err){
      console.error('fetchCourse error', err);
      const details = err.response?.data || err.message || String(err);
      // If the course fetch is forbidden or not found, try fallbacks:
      const status = err.response?.status;
      if (status === 403 && getRoleRaw && getRoleRaw() === 2) {
        try{
          const myRes = await API.myCourses();
          const mine = (myRes.data || []).find(c => String(c.id) === String(id) || String(c.pk) === String(id));
          if (mine) {
            // Use the returned course object from my-courses as a fallback view
            setCourse(mine);
            const remoteLessons = mine.lessons || []; 
            const finalLessons = (remoteLessons && remoteLessons.length) ? remoteLessons : [];
            setLessons(finalLessons);
            setSelectedLesson(finalLessons[0] || null);
            setIsOwner(true);
            setMessage('Loaded course via creator fallback (my-courses).');
            setLoading(false);
            return;
          }
        }catch(innerErr){
          console.error('fallback myCourses error', innerErr);
        }
      }

      // Try the public listing fallback (for learners/public courses)
      try{
        const listRes = await API.listCourses();
        const results = listRes.data?.results || listRes.data || [];
        const foundInList = (results || []).find(c => String(c.id) === String(id) || String(c.pk) === String(id));
        if (foundInList) {
          setCourse(foundInList);
          const remoteLessons = foundInList.lessons || [];
          const finalLessons = (remoteLessons && remoteLessons.length) ? remoteLessons : [];
          setLessons(finalLessons);
          setSelectedLesson(finalLessons[0] || null);
          setMessage('Loaded course via public listing fallback (listCourses).');
          setLoading(false);
          return;
        }
      }catch(listErr){
        console.error('fallback listCourses error', listErr);
      }

      setError('Failed to load course. See debug below.');
      setDebugInfo(details);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async ()=>{
    try{
      const res = await API.listEnrollments();
      const myEnroll = (res.data.results || []).find(e => String(e.course) === String(id));
      setEnrollment(myEnroll || null);
    }catch(err){
      // not enrolled
      setEnrollment(null);
    }
  };

  const fetchProfile = async () => {
    try{
      const resp = await API.getProfile();
      setProfile(resp.data);
    }catch(err){
      // not authenticated or failed to fetch; leave profile null
      setProfile(null);
    }
  };

  const handleSelectLesson = (lesson) => {
    setSelectedLesson(lesson);
    setMessage('');
    setError('');
  };

  // formatContent is provided by shared util: ../utils/contentFormat

  const handleMarkComplete = async (lessonId) => {
    if(!enrollment){
      setError('You need to enroll first. Redirecting to enrollment page...');
      setTimeout(()=>navigate('/enrollment'),1200);
      return;
    }

    try{
      await API.markLessonComplete(id, lessonId);
      setMessage('Lesson marked complete. Refreshing progress...');
      // refresh enrollments and course detail to pick up progress
      await fetchEnrollments();
      await fetchCourse();
    }catch(err){
      setError(err.response?.data?.message || 'Failed to mark complete');
    }
  };

  // Creator actions: open modal editor for course (owner only)
  const handleEditCourse = () => {
    if(!course) return;
    if (!isOwner) return setError('You are not authorized to edit this course.');
    openCourseEditor();
  };

  const handleDeleteCourse = async () => {
    if(!course) return;
    if (!isOwner) return setError('You are not authorized to delete this course.');
    // open confirm dialog
    setConfirmTarget({ type: 'course', id: course.id });
    setConfirmOpen(true);
  };

  // Creator actions: open lesson in modal editor (owner only)
  const handleEditLesson = (lesson) => {
    if (!isOwner) return setError('You are not authorized to update this lesson.');
    openLessonEditor(lesson);
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!isOwner) return setError('You are not authorized to delete this lesson.');
    setConfirmTarget({ type: 'lesson', id: lessonId });
    setConfirmOpen(true);
  };

  const handleIssueCertificate = async () => {
    if(!enrollment) return setError('No enrollment found.');
    try{
      const res = await API.issueCertificate(enrollment.id);
      setMessage(`Certificate issued! Hash: ${res.data.certificate.serial_hash}`);
      fetchEnrollments();
    }catch(err){
      setError(err.response?.data?.message || 'Failed to issue certificate');
    }
  };

  const isLessonComplete = (lessonId) => {
    if(!enrollment) return false;
    const completed = enrollment.completed_lessons || []; // backend should return this shape
    return completed.some(l => String(l) === String(lessonId));
  };

  const allLessonsComplete = () => {
    if(!enrollment || !lessons) return false;
    const completed = enrollment.completed_lessons || [];
    return lessons.length > 0 && lessons.every(ls => completed.includes(ls.id));
  };

  return (
    <div>
      <div style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
        <div style={{flex:'1 1 260px',minWidth:260}}>
          <h2>{course?.title || 'Course'}</h2>
          <p className="muted">{course?.description}</p>

          <Card className="mt-20">
            <h4>Lessons</h4>
            <ul className="list">
              {(lessons||[]).map(lesson => (
                <li key={lesson.id} className="list-item" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{cursor:'pointer'}} onClick={() => handleSelectLesson(lesson)}>
                    <strong>{lesson.title}</strong>
                    <div className="muted">{lesson.summary || lesson.title}</div>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    {isLessonComplete(lesson.id) ? <span className="muted">✓</span> : <Button onClick={() => handleMarkComplete(lesson.id)}>Mark</Button>}
                    {getRoleRaw() === 2 && (
                      <>
                        <Button onClick={() => openLessonEditor(lesson)}>Edit</Button>
                        <Button className="btn-danger" onClick={() => handleDeleteLesson(lesson.id)}>Delete</Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {enrollment && (
            <Card className="mt-20">
              <div className="muted">Progress: {enrollment.completed_lessons ? enrollment.completed_lessons.length : 0} / {lessons.length}</div>
              {allLessonsComplete() ? (
                <div className="mt-20">
                  <Button className="btn-primary" onClick={handleIssueCertificate}>Claim Certificate</Button>
                </div>
              ) : null}
              {enrollment && enrollment.certificate && (
                <div className="mt-10">
                  <a className="btn btn-primary" href={`${import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'}/enrollment/certificate/pdf/${enrollment.certificate.serial_hash}`} target="_blank" rel="noreferrer">Download Certificate PDF</a>
                </div>
              )}
            </Card>
          )}
        </div>

        <div style={{flex:'2 1 420px',minWidth:320}}>
          <h3>Lesson Content</h3>
          {loading && <div className="alert info">Loading course...</div>}
          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}
          {debugInfo && (
            <div style={{marginTop:12}}>
              <details>
                <summary style={{cursor:'pointer'}}>Debug info (click to expand)</summary>
                <pre style={{whiteSpace:'pre-wrap',marginTop:8}}>{JSON.stringify(debugInfo, null, 2)}</pre>
              </details>
            </div>
          )}

          <Card>
            {selectedLesson ? (
              <div>
                <h4>{selectedLesson.title}</h4>
                <div className="muted">{selectedLesson.summary}</div>
                <div className="lesson-content" style={{marginTop:12}} dangerouslySetInnerHTML={{__html: formatContent(selectedLesson.content || selectedLesson.body || '')}} />

                <div style={{marginTop:16}}>
                  {isLessonComplete(selectedLesson.id) ? (
                    <span className="muted">You completed this lesson ✓</span>
                  ) : (
                    <Button className="btn-primary" onClick={() => handleMarkComplete(selectedLesson.id)}>Mark as Complete</Button>
                  )}
                </div>
              </div>
            ) : (
              <p>Select a lesson to read its content.</p>
            )}
          </Card>
        </div>
      </div>
      {/* Editor Modal */}
      <Modal title={editorItem?.type === 'course' ? 'Edit Course' : 'Edit Lesson'} isOpen={editorOpen} onClose={closeEditor}>
        {editorItem && (
          <div>
            <label>Title</label>
            <Input value={editorItem.title} onChange={(e) => setEditorItem({ ...editorItem, title: e.target.value })} />
            <label style={{marginTop:12}}>Content</label>
            <Textarea value={editorItem.content} onChange={(e) => setEditorItem({ ...editorItem, content: e.target.value })} rows={12} />
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
              <Button onClick={closeEditor} disabled={editorSaving}>Cancel</Button>
              <Button className="btn-primary" onClick={saveEditor} disabled={editorSaving}>{editorSaving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Confirm delete modal */}
      <ConfirmDialog
        title="Confirm Delete"
        message="Are you sure you want to delete? This action cannot be undone."
        isOpen={confirmOpen}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={async () => {
          if(!confirmTarget) return setConfirmOpen(false);
          try{
            if(confirmTarget.type === 'course'){
              await API.deleteCourse(confirmTarget.id);
              setMessage('Course deleted. Redirecting to manager...');
              setTimeout(()=>navigate('/course-manager'),900);
            } else if(confirmTarget.type === 'lesson'){
              await API.deleteLesson(course.id, confirmTarget.id);
              setMessage('Lesson deleted');
              await fetchCourse();
            }
          }catch(err){ setError(err.response?.data?.message || 'Delete failed'); }
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}
