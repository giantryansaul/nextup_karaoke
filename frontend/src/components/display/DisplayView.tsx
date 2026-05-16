import { useState, useCallback } from 'react';
import type { SessionState } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { YouTubePlayer } from './YouTubePlayer';
import { QueueSidebar } from './QueueSidebar';

const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin;
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function DisplayView() {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);

  useWebSocket(setSessionState);

  const queue = sessionState?.queue ?? [];
  const nowPlayingId = sessionState?.now_playing ?? null;
  const isPaused = sessionState?.is_paused ?? false;
  const nowPlayingItem = queue.find((i) => i.id === nowPlayingId) ?? null;

  const handleVideoEnded = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/queue/advance`, { method: 'POST' });
    } catch { /* WebSocket delivers updated state regardless */ }
  }, []);

  const handlePause = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/queue/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: !isPaused }),
      });
    } catch { /* ignore */ }
  }, [isPaused]);

  const handleSkip = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/queue/advance`, { method: 'POST' });
    } catch { /* ignore */ }
  }, []);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      background: '#000',
      overflow: 'hidden',
    }}>
      {/* YouTube player — 80% */}
      <div style={{ flex: '0 0 80%', height: '100%' }}>
        <YouTubePlayer
          nowPlayingVideoId={nowPlayingItem?.video_id ?? null}
          isPaused={isPaused}
          onVideoEnded={handleVideoEnded}
        />
      </div>

      {/* Queue sidebar — 20% */}
      <div style={{ flex: '0 0 20%', height: '100%' }}>
        <QueueSidebar
          queue={queue}
          nowPlayingId={nowPlayingId}
          isPaused={isPaused}
          appUrl={APP_URL}
          onPause={handlePause}
          onSkip={handleSkip}
        />
      </div>
    </div>
  );
}
