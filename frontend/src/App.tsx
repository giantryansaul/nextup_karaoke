import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import { QueueProvider, useQueue } from './context/QueueContext';
import { useWebSocket } from './hooks/useWebSocket';
import { LandingPage } from './components/mobile/LandingPage';
import { JoinPage } from './components/mobile/JoinPage';
import { SearchPage } from './components/mobile/SearchPage';
import { QueuePage } from './components/mobile/QueuePage';
import { UserPage } from './components/mobile/UserPage';
import { DisplayView } from './components/display/DisplayView';
import { NavBar } from './components/shared/NavBar';

function MobileWebSocketSync() {
  const { setState } = useQueue();
  const { partyCode, setPartyCode, setUser } = useUser();
  const navigate = useNavigate();

  const handlePartyEnd = useCallback(() => {
    setUser(null);
    setPartyCode(null);
    navigate('/', { replace: true });
  }, [setUser, setPartyCode, navigate]);

  useWebSocket(setState, partyCode, handlePartyEnd);
  return null;
}

function MobileLayout({ children }: { children: ReactNode }) {
  const { user } = useUser();
  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      {user && <MobileWebSocketSync />}
      {user && <NavBar />}
      <div style={{ paddingBottom: user ? '60px' : '0' }}>
        {children}
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, partyCode } = useUser();
  if (!user || !partyCode) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/display/:partyCode" element={<DisplayView />} />
      <Route path="/join/:partyCode" element={<JoinPage />} />
      <Route
        path="/search"
        element={
          <MobileLayout>
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          </MobileLayout>
        }
      />
      <Route
        path="/queue"
        element={
          <MobileLayout>
            <ProtectedRoute>
              <QueuePage />
            </ProtectedRoute>
          </MobileLayout>
        }
      />
      <Route
        path="/user"
        element={
          <MobileLayout>
            <ProtectedRoute>
              <UserPage />
            </ProtectedRoute>
          </MobileLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <UserProvider>
      <QueueProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueueProvider>
    </UserProvider>
  );
}
