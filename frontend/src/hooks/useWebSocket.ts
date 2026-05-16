import { useEffect, useRef } from 'react';
import type { SessionState } from '../types';

function getWsUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/^https?/, (m: string) => (m === 'https' ? 'wss' : 'ws')) + '/ws';
  }
  return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
}

export function useWebSocket(onMessage: (state: SessionState) => void): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;
    let retryDelay = 1000;

    function connect() {
      if (destroyed) return;
      ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        retryDelay = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as { type: string; data: SessionState };
          if (msg.type === 'state_update') {
            onMessageRef.current(msg.data as SessionState);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!destroyed) {
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30000);
            connect();
          }, retryDelay);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    // Reconnect when tab becomes visible again — critical for mobile screen unlock
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (ws && ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
          ws.close();
          connect();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      ws?.close();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
