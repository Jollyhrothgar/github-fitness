import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Home from '@/pages/Home';
import Workout from '@/pages/Workout';
import Plans from '@/pages/Plans';
import Exercises from '@/pages/Exercises';
import Progress from '@/pages/Progress';
import Settings from '@/pages/Settings';
import OAuthCallback from '@/pages/OAuthCallback';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/workout/:sessionId" element={<Workout />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
