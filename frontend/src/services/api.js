import axios from 'axios';

// Dynamically determine the backend URL based on the current hostname
const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for sending/receiving HTTP-only cookies
});

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  refresh: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};

export const adminService = {
  getModules: async () => {
    const response = await api.get('/admin/modules');
    return response.data;
  },
  getDashboardMetrics: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
  getQuestions: async (moduleId) => {
    const response = await api.get('/admin/questions', { params: { module_id: moduleId } });
    return response.data;
  },
  uploadKnowledgeDocument: async (moduleId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/admin/modules/${moduleId}/upload-docs`, formData);
    return response.data;
  },
  getKnowledgeDocuments: async (moduleId) => {
    const response = await api.get(`/admin/modules/${moduleId}/docs`);
    return response.data;
  },
  getKnowledgeDocumentDetail: async (docId) => {
    const response = await api.get(`/admin/docs/${docId}`);
    return response.data;
  },
  deleteKnowledgeDocument: async (docId) => {
    await api.delete(`/admin/docs/${docId}`);
    return true;
  },
  createQuestion: async (questionData) => {
    const response = await api.post('/admin/questions', questionData);
    return response.data;
  },
  toggleQuestionStatus: async (questionId) => {
    const response = await api.put(`/admin/questions/${questionId}/toggle`);
    return response.data;
  },
  deleteQuestion: async (questionId) => {
    await api.delete(`/admin/questions/${questionId}`);
    return true;
  },
  createUser: async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  }
};

export const vivaService = {
  getTrainee: async (userId) => {
    const response = await api.get(`/viva/trainee/${userId}`);
    return response.data;
  },
  assignSession: async (traineeId, moduleId, durationMinutes = 15) => {
    const response = await api.post('/viva/sessions/assign', {
      trainee_id: traineeId,
      module_id: moduleId,
      duration_minutes: durationMinutes
    });
    return response.data;
  },
  startSession: async () => {
    const response = await api.post('/viva/sessions/start');
    return response.data;
  },
  getNextQuestion: async (sessionId) => {
    const response = await api.post(`/viva/${sessionId}/next-question`);
    return response.data;
  },
  submitAnswer: async (sessionId, questionId, transcript) => {
    const response = await api.post(`/viva/${sessionId}/answer`, {
      viva_question_id: questionId,
      transcript: transcript
    });
    return response.data;
  },
  getSessionSummary: async (sessionId) => {
    const response = await api.get(`/viva/${sessionId}/summary`);
    return response.data;
  },
  evaluateSession: async (sessionId) => {
    const response = await api.post(`/viva/${sessionId}/evaluate`);
    return response.data;
  },
  getSessionReport: async (sessionId) => {
    const response = await api.get(`/viva/${sessionId}/report`);
    return response.data;
  },
  getAllSessions: async () => {
    const response = await api.get('/viva');
    return response.data;
  },
  reportFraudFlag: async (sessionId, vivaQuestionId, flagType) => {
    try {
      await api.post(`/viva/${sessionId}/fraud-flag`, {
        viva_question_id: vivaQuestionId,
        flag_type: flagType,
        detected_at: new Date().toISOString()
      });
    } catch {
      // Fail silently — never interrupt the trainee's exam
    }
  }
};

export default api;
