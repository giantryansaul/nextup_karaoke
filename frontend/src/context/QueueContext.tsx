import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { MoveDirection, SessionState } from '../types';
import { useUser } from './UserContext';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface AddItemPayload {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

interface QueueContextValue {
  state: SessionState | null;
  setState: (s: SessionState) => void;
  addToQueue: (item: AddItemPayload) => Promise<void>;
  removeFromQueue: (itemId: string) => Promise<void>;
  moveQueueItem: (itemId: string, direction: MoveDirection) => Promise<void>;
  advanceQueue: () => Promise<void>;
  setPaused: (paused: boolean) => Promise<void>;
  clearQueue: () => Promise<void>;
}

const QueueContext = createContext<QueueContextValue | null>(null);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState | null>(null);
  const { user, setUser } = useUser();
  const reregisteredRef = useRef(false);

  // When the first state arrives, re-register if the backend doesn't know this user.
  // This handles the case where the server restarted and lost in-memory user records.
  useEffect(() => {
    if (!state || !user || reregisteredRef.current) return;
    if (user.id in state.users) return;
    reregisteredRef.current = true;
    fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.name, color: user.color }),
    })
      .then((res) => res.json())
      .then((newUser) => setUser(newUser as typeof user))
      .catch(() => {});
  }, [state, user, setUser]);

  async function addToQueue(item: AddItemPayload): Promise<void> {
    if (!user) return;
    const res = await fetch(`${API_BASE}/api/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, user_id: user.id }),
    });
    if (!res.ok) throw new Error('Failed to add to queue');
  }

  async function removeFromQueue(itemId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/queue/${itemId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove from queue');
  }

  async function moveQueueItem(itemId: string, direction: MoveDirection): Promise<void> {
    const res = await fetch(`${API_BASE}/api/queue/${itemId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) throw new Error('Failed to move queue item');
  }

  async function advanceQueue(): Promise<void> {
    const res = await fetch(`${API_BASE}/api/queue/advance`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to advance queue');
  }

  async function setPaused(paused: boolean): Promise<void> {
    const res = await fetch(`${API_BASE}/api/queue/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused }),
    });
    if (!res.ok) throw new Error('Failed to set pause state');
  }

  async function clearQueue(): Promise<void> {
    const res = await fetch(`${API_BASE}/api/queue`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear queue');
  }

  return (
    <QueueContext.Provider value={{ state, setState, addToQueue, removeFromQueue, moveQueueItem, advanceQueue, setPaused, clearQueue }}>
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue(): QueueContextValue {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue must be used within QueueProvider');
  return ctx;
}
