import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WelcomeCheck from './pages/WelcomeCheck';
import VivaInProgress from './pages/VivaInProgress';
import VivaComplete from './pages/VivaComplete';
import TrainerDashboard from './pages/TrainerDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomeCheck />} />
        <Route path="/interview" element={<VivaInProgress />} />
        <Route path="/complete" element={<VivaComplete />} />
        {/* We will route the dashboard to /hr/dashboard for now */}
        <Route path="/hr/dashboard" element={<TrainerDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
