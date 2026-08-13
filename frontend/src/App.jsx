import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import WelcomeCheck from './pages/WelcomeCheck';
import VivaInProgress from './pages/VivaInProgress';
import VivaComplete from './pages/VivaComplete';
import TrainerDashboard from './pages/TrainerDashboard';
import TrainerReviewDetail from './pages/TrainerReviewDetail';
import AdminQuestionBank from './pages/AdminQuestionBank';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import { AuthProvider } from './store/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/hr/login" element={<Navigate to="/" replace />} />
          
          {/* Trainee Flows */}
          <Route element={<ProtectedRoute allowedRoles={['TRAINEE']} />}>
            <Route path="/welcome" element={<WelcomeCheck />} />
            <Route path="/interview" element={<VivaInProgress />} />
            <Route path="/complete" element={<VivaComplete />} />
          </Route>

          {/* Trainer / HR Flows */}
          <Route element={<ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']} />}>
            <Route path="/hr/dashboard" element={<TrainerDashboard />} />
            <Route path="/hr/review/:id" element={<TrainerReviewDetail />} />
            <Route path="/hr/questions" element={<AdminQuestionBank />} />
            <Route path="/hr/users" element={<UserManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
