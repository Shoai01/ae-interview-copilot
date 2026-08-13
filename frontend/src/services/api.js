import axios from 'axios';

// Ensure your backend runs on this port or update it accordingly.
const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const adminService = {
  getModules: async () => {
    const response = await api.get('/admin/modules');
    return response.data;
  },
  getQuestions: async (moduleId) => {
    const response = await api.get(`/admin/questions?module_id=${moduleId}`);
    return response.data;
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
  }
};

export const vivaService = {
  createSession: async (traineeId, moduleId) => {
    const response = await api.post('/viva/sessions', {
      trainee_id: traineeId,
      module_id: moduleId
    });
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
  getTrainee: async (traineeId) => {
    const response = await api.get(`/viva/trainees/${traineeId}`);
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
    } catch (_) {
      // Fail silently — never interrupt the trainee's exam
    }
  }
};

export default api;
