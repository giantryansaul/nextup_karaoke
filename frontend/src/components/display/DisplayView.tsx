import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SessionState } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { YouTubePlayer } from './YouTubePlayer';
import { QueueSidebar } from './QueueSidebar';

const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin;
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function DisplayView() {
  const { partyCode } = useParams<{ partyCode: string }>();
  const code = (partyCode ?? '').toUpperCase();
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [skipToNearEndSignal, setSkipToNearEndSignal] = useState(0);

  const handlePartyEnd = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  useWebSocket(setSessionState, code, handlePartyEnd);

  const queue = sessionState?.queue ?? [];
  const nowPlayingId = sessionState?.now_playing ?? null;
  const isPaused = sessionState?.is_paused ?? false;
  const restartSignal = sessionState?.restart_signal ?? 0;
  const nowPlayingItem = queue.find((i) => i.id === nowPlayingId) ?? null;

  const handleVideoEnded = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/parties/${code}/queue/advance`, { method: 'POST' });
    } catch { /* WebSocket delivers updated state regardless */ }
  }, [code]);

  const handlePause = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/parties/${code}/queue/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: !isPaused }),
      });
    } catch { /* ignore */ }
  }, [code, isPaused]);

  const handleSkip = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/parties/${code}/queue/advance`, { method: 'POST' });
    } catch { /* ignore */ }
  }, [code]);

  const handleRestart = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/parties/${code}/queue/restart`, { method: 'POST' });
    } catch { /* ignore */ }
  }, [code]);

  const handleEndParty = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/parties/${code}`, { method: 'DELETE' });
    } catch { /* ignore */ }
    navigate('/', { replace: true });
  }, [code, navigate]);

  const joinUrl = `${APP_URL}/join/${code}`;

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
          restartSignal={restartSignal}
          skipToNearEndSignal={skipToNearEndSignal}
          onVideoEnded={handleVideoEnded}
        />
      </div>

      {/* Queue sidebar — 20% */}
      <div style={{ flex: '0 0 20%', height: '100%', overflow: 'hidden' }}>
        <QueueSidebar
          queue={queue}
          nowPlayingId={nowPlayingId}
          isPaused={isPaused}
          partyCode={code}
          joinUrl={joinUrl}
          onPause={handlePause}
          onSkip={handleSkip}
          onRestart={handleRestart}
          onSkipToNearEnd={() => setSkipToNearEndSignal((s) => s + 1)}
          onEndParty={handleEndParty}
        />
      </div>
    </div>
  );
}
