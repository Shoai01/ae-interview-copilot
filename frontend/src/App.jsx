import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import WelcomeCheck from './pages/WelcomeCheck';
import VivaInProgress from './pages/VivaInProgress';
import VivaComplete from './pages/VivaComplete';
import TrainerSessions from './pages/TrainerSessions';
import TrainerOverview from './pages/TrainerOverview';
import TrainerReviewDetail from './pages/TrainerReviewDetail';
import AdminQuestionBank from './pages/AdminQuestionBank';
import UserManagement from './pages/UserManagement';
import KnowledgeBase from './pages/KnowledgeBase';
import AuditLogs from './pages/AuditLogs';
import Login from './pages/Login';
import ForcePasswordChange from './pages/ForcePasswordChange';
import { AuthProvider } from './store/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} toastOptions={{ style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', minWidth: '300px', zIndex: 99999 } }} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/hr/login" element={<Navigate to="/" replace />} />
          
          {/* Password Change Flow (Protected for authenticated users) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/change-password" element={<ForcePasswordChange />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['TRAINEE']} />}>
            <Route path="/welcome" element={<WelcomeCheck />} />
            <Route path="/interview" element={<VivaInProgress />} />
            <Route path="/complete" element={<VivaComplete />} />
          </Route>

          {/* Trainer / HR Flows */}
          <Route element={<ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']} />}>
            <Route path="/hr/dashboard" element={<TrainerOverview />} />
            <Route path="/hr/sessions" element={<TrainerSessions />} />
            <Route path="/hr/review/:id" element={<TrainerReviewDetail />} />
            <Route path="/hr/questions" element={<AdminQuestionBank />} />
            <Route path="/hr/knowledge" element={<KnowledgeBase />} />
            <Route path="/hr/users" element={<UserManagement />} />
            <Route path="/hr/logs" element={<AuditLogs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
