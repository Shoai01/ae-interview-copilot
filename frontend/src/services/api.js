import axios from 'axios';

// Dynamically determine the backend URL based on environment or current hostname
export const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_BACKEND_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : `${window.location.protocol}//${window.location.hostname}`);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for sending/receiving HTTP-only cookies
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
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
  },
  changePassword: async (oldPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    });
    return response.data;
  }
};

export const adminService = {
  getModules: async () => {
    const response = await api.get('/admin/modules');
    return response.data;
  },
  getDashboardMetrics: async (moduleId = null) => {
    const response = await api.get('/admin/dashboard', { params: moduleId ? { module_id: moduleId } : {} });
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
  createQuestionsBulk: async (bulkData) => {
    const response = await api.post('/admin/questions/bulk', bulkData);
    return response.data;
  },
  updateQuestion: async (questionId, questionData) => {
    const response = await api.put(`/admin/questions/${questionId}`, questionData);
    return response.data;
  },
  renameSet: async (moduleId, oldSetName, newSetName) => {
    await api.put(`/admin/modules/${moduleId}/sets/${encodeURIComponent(oldSetName)}`, { new_set_name: newSetName });
    return true;
  },
  deleteSet: async (moduleId, setName) => {
    await api.delete(`/admin/modules/${moduleId}/sets/${encodeURIComponent(setName)}`);
    return true;
  },
  generateSetViaAI: async (moduleId, setName, count = 15) => {
    const response = await api.post(`/admin/generate-set`, null, {
      params: { module_id: moduleId, set_name: setName, count }
    });
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
  },
  updateUser: async (userId, userData) => {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
  },
  deleteUser: async (userId) => {
    await api.delete(`/admin/users/${userId}`);
    return true;
  },
  getAuditLogs: async (params) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  }
};

export const vivaService = {
  getTrainee: async (userId) => {
    const response = await api.get(`/viva/trainee/${userId}`);
    return response.data;
  },
  getModuleSets: async (moduleId) => {
    const response = await api.get(`/admin/modules/${moduleId}/sets`);
    return response.data;
  },
  assignSession: async (traineeId, traineeIdentifier, traineeFullName, moduleId, durationMinutes = 15, questionCount = null, setName = '') => {
    const payload = {
      module_id: moduleId,
      duration_minutes: durationMinutes
    };
    if (traineeId) payload.trainee_id = traineeId;
    if (traineeIdentifier) payload.trainee_identifier = traineeIdentifier;
    if (traineeFullName) payload.trainee_full_name = traineeFullName;
    if (questionCount !== null && questionCount !== "") payload.question_count = parseInt(questionCount);
    if (setName) payload.set_name = setName;
    
    const response = await api.post('/viva/sessions/assign', payload);
    return response.data;
  },
  assignSessionBulk: async (moduleId, durationMinutes, questionCount, setName, trainees) => {
    const payload = {
      module_id: moduleId,
      duration_minutes: durationMinutes,
      trainees: trainees
    };
    if (questionCount !== null && questionCount !== "") payload.question_count = parseInt(questionCount);
    if (setName) payload.set_name = setName;
    
    const response = await api.post('/viva/sessions/assign/bulk', payload);
    return response.data;
  },
  startSession: async () => {
    const response = await api.post('/viva/sessions/start');
    return response.data;
  },
  getCurrentSession: async () => {
    const response = await api.get('/viva/sessions/current');
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
  uploadAnswerAudio: async (sessionId, questionId, audioBlob, token = null) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'answer.webm');
    
    const headers = {
      'ngrok-skip-browser-warning': 'true'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Note: Do NOT set Content-Type — fetch automatically sets multipart/form-data with boundary
    const response = await fetch(`${API_BASE_URL}/viva/${sessionId}/answer/${questionId}/audio`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AudioUpload] Server returned error ${response.status}:`, errText);
      throw new Error(`Audio upload failed (${response.status}): ${errText}`);
    }
    
    return await response.json();
  },
  getSessionSummary: async (sessionId) => {
    const response = await api.get(`/viva/${sessionId}/summary`);
    return response.data;
  },
  getDeepgramToken: async () => {
    const response = await api.get('/viva/deepgram/token');
    return response.data;
  },
  synthesizeSpeech: async (text) => {
    const response = await api.post('/viva/tts', { text }, { responseType: 'blob' });
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
  },
  submitDecision: async (sessionId, decision, notes, finalScore) => {
    const payload = { decision, notes: notes || null };
    if (finalScore !== undefined && finalScore !== null) {
      payload.final_score = parseFloat(finalScore);
    }
    const response = await api.put(`/viva/${sessionId}/decision`, payload);
    return response.data;
  }
};

export default api;
