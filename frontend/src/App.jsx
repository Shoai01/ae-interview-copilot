import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WelcomeCheck from './pages/WelcomeCheck';
import VivaInProgress from './pages/VivaInProgress';
import VivaComplete from './pages/VivaComplete';
import TrainerDashboard from './pages/TrainerDashboard';
import TrainerReviewDetail from './pages/TrainerReviewDetail';
import AdminQuestionBank from './pages/AdminQuestionBank';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomeCheck />} />
        <Route path="/interview" element={<VivaInProgress />} />
        <Route path="/complete" element={<VivaComplete />} />
        {/* Trainer / HR Flows */}
        <Route path="/hr/dashboard" element={<TrainerDashboard />} />
        <Route path="/hr/review/:id" element={<TrainerReviewDetail />} />
        <Route path="/hr/questions" element={<AdminQuestionBank />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
