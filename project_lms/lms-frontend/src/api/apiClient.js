// src/api/apiClient.js

import axios from 'axios';

// Base URL for your Django backend
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject the Access Token into every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add API methods for clarity
export const API = {
  // --- Auth ---
  register: (data) => apiClient.post('/users/register/', data),
  login: (data) => apiClient.post('/users/login/', data),
  // Token refresh and profile
  refreshToken: (refresh) => apiClient.post('/users/token/refresh/', { refresh }),
  getProfile: () => apiClient.get('/users/profile/'),
  
  // --- Courses (Requires Auth) ---
  createCourse: (data) => apiClient.post('/courses/', data),
  listCourses: () => apiClient.get('/courses/'),
  myCourses: () => apiClient.get('/courses/my-courses/'),
  addLesson: (courseId, data) => apiClient.post(`/courses/${courseId}/lessons/`, data),
  getCourse: (courseId) => apiClient.get(`/courses/${courseId}/`),
  updateCourse: (courseId, data) => apiClient.patch(`/courses/${courseId}/`, data),
  deleteCourse: (courseId) => apiClient.delete(`/courses/${courseId}/`),
  updateLesson: (courseId, lessonId, data) => apiClient.patch(`/courses/${courseId}/lessons/${lessonId}/`, data),
  deleteLesson: (courseId, lessonId) => apiClient.delete(`/courses/${courseId}/lessons/${lessonId}/`),
  
  // --- Admin/Creator ---
  applyForCreator: (data, token) => {
    // Note: Since this is used before a new token is issued, 
    // it relies on the interceptor using the old token.
    return apiClient.post('/creator/apply/', data);
  },
  
  // Add other endpoints as needed (lessons, enrollment, etc.)
  // --- Enrollment / Progress ---
  listEnrollments: () => apiClient.get('/enrollment/'),
  enroll: (courseId) => apiClient.post('/enrollment/', { course: courseId }),
  // Backend expects course_id and lesson_id in the URL; backend will deduce the enrollment
  markLessonComplete: (courseId, lessonId) => apiClient.post(`/enrollment/${courseId}/lessons/${lessonId}/complete/`),
  issueCertificate: (enrollmentId) => apiClient.post(`/enrollment/${enrollmentId}/certificate/issue/`),
};

export default apiClient;
export { API_BASE_URL };