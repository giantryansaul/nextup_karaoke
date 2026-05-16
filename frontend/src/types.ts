export interface User {
  id: string;
  name: string;
  color: string;
}

export interface QueueItem {
  id: string;
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  added_by_id: string;
  added_by_name: string;
  added_by_color: string;
}

export interface SessionState {
  queue: QueueItem[];
  now_playing: string | null;
  is_paused: boolean;
  users: Record<string, User>;
}

export type MoveDirection = 'up' | 'down' | 'top' | 'bottom';

export interface SearchResult {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
}

export const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: 'Red',    hex: '#FF4444' },
  { name: 'Orange', hex: '#FF8800' },
  { name: 'Yellow', hex: '#FFD700' },
  { name: 'Green',  hex: '#44BB44' },
  { name: 'Teal',   hex: '#00BBAA' },
  { name: 'Blue',   hex: '#4488FF' },
  { name: 'Purple', hex: '#AA44FF' },
  { name: 'Pink',   hex: '#FF44AA' },
  { name: 'White',  hex: '#FFFFFF' },
  { name: 'Gold',   hex: '#FFB700' },
];
