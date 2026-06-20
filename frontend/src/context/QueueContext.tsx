import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { MoveDirection, SessionState, User } from '../types';
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
  addToQueue: (item: AddItemPayload, asUserId?: string) => Promise<void>;
  registerUser: (name: string, color: string) => Promise<User>;
  removeFromQueue: (itemId: string) => Promise<void>;
  moveQueueItem: (itemId: string, direction: MoveDirection) => Promise<void>;
  advanceQueue: () => Promise<void>;
  restartTrack: () => Promise<void>;
  setPaused: (paused: boolean) => Promise<void>;
  clearQueue: () => Promise<void>;
  endParty: () => Promise<void>;
}

const QueueContext = createContext<QueueContextValue | null>(null);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState | null>(null);
  const { user, setUser, partyCode } = useUser();
  const reregisteredRef = useRef(false);

  // When the first state arrives, re-register if the backend doesn't know this user.
  useEffect(() => {
    if (!state || !user || !partyCode || reregisteredRef.current) return;
    if (user.id in state.users) return;
    reregisteredRef.current = true;
    fetch(`${API_BASE}/api/parties/${partyCode}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.name, color: user.color }),
    })
      .then((res) => res.json())
      .then((newUser) => setUser(newUser as typeof user))
      .catch(() => {});
  }, [state, user, partyCode, setUser]);

  async function addToQueue(item: AddItemPayload, asUserId?: string): Promise<void> {
    if (!user || !partyCode) return;
    const res = await fetch(`${API_BASE}/api/parties/${partyCode}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, user_id: asUserId ?? user.id }),
    });
    if (!res.ok) throw new Error('Failed to add to queue');
  }

  async function registerUser(name: string, color: string): Promise<User> {
    if (!partyCode) throw new Error('No party code');
    const res = await fetch(`${API_BASE}/api/parties/${partyCode}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) throw new Error('Failed to register user');
    return res.json() as Promise<User>;
  }

  async function removeFromQueue(itemId: string): Promise<void> {
    if (!partyCode) return;
    const res = await fetch(`${API_BASE}/api/parties/${partyCode}/queue/${itemId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove from queue');
  }

  async function moveQueueItem(itemId: string, direction: MoveDirection): Promise<void> {
    if (!partyCode) return;
    const res = await fetch(`${API_BASE}/api/parties/${partyCode}/queue/${itemId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) throw new Error('Failed to move queue item');
  }

  async function advanceQueue(): Promise<void> {
    if (!partyCode) return;
    const res = await fetch(`${API_BASE}/api/parties/${partyCode}/queue/advance`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to advance queue');
  }

  async function restartTrack(): Promise<void> {
    if (!partyCode) return;
    const res = await fetch(`${API_BASE}/api/parties/${partyCode}/queue/restart`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to restart track');
  }

  async function setPaused(paused: boolean): Promise<void> {
    if (!partyCode) return;
    const res = await fetch(`${API_BASE}/api/parties/${partyCode}/queue/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused }),
    });
    if (!res.ok) throw new Error('Failed to set pause state');
  }

  async function clearQueue(): Promise<void> {
    if (!partyCode) return;
    const res = await fetch(`${API_BASE}/api/parties/${partyCode}/queue`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear queue');
  }

  async function endParty(): Promise<void> {
    if (!partyCode) return;
    await fetch(`${API_BASE}/api/parties/${partyCode}`, { method: 'DELETE' });
    // Navigation is handled by the party_ended WebSocket event
  }

  return (
    <QueueContext.Provider value={{ state, setState, addToQueue, registerUser, removeFromQueue, moveQueueItem, advanceQueue, restartTrack, setPaused, clearQueue, endParty }}>
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue(): QueueContextValue {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue must be used within QueueProvider');
  return ctx;
}
