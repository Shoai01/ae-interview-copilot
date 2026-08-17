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
import Login from './pages/Login';
import { AuthProvider } from './store/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'DM Sans, sans-serif' } }} />
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
            <Route path="/hr/dashboard" element={<TrainerOverview />} />
            <Route path="/hr/sessions" element={<TrainerSessions />} />
            <Route path="/hr/review/:id" element={<TrainerReviewDetail />} />
            <Route path="/hr/questions" element={<AdminQuestionBank />} />
            <Route path="/hr/knowledge" element={<KnowledgeBase />} />
            <Route path="/hr/users" element={<UserManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
