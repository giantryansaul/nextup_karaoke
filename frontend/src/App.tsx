import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import { QueueProvider, useQueue } from './context/QueueContext';
import { useWebSocket } from './hooks/useWebSocket';
import { JoinPage } from './components/mobile/JoinPage';
import { SearchPage } from './components/mobile/SearchPage';
import { QueuePage } from './components/mobile/QueuePage';
import { UserPage } from './components/mobile/UserPage';
import { DisplayView } from './components/display/DisplayView';
import { NavBar } from './components/shared/NavBar';

function MobileWebSocketSync() {
  const { setState } = useQueue();
  useWebSocket(setState);
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
  const { user } = useUser();
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/display" element={<DisplayView />} />
      <Route
        path="/"
        element={
          <MobileLayout>
            <JoinPage />
          </MobileLayout>
        }
      />
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
