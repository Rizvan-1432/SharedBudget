import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { JoinSpacePage } from './pages/JoinSpacePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SpacePage } from './pages/SpacePage';
import { SpacesPage } from './pages/SpacesPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join/:spaceId" element={<JoinSpacePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/spaces" element={<SpacesPage />} />
          <Route path="/spaces/:spaceId" element={<SpacePage />} />
        </Route>

        <Route path="/" element={<Navigate to="/spaces" replace />} />
        <Route path="*" element={<Navigate to="/spaces" replace />} />
      </Route>
    </Routes>
  );
}
