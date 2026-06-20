# Favorites Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-device favorites stored in `localStorage` — star songs from Search and Queue, browse them in a new Favorites tab.

**Architecture:** A `FavoritesContext` provider (matching the existing `UserContext`/`QueueContext` pattern) manages a `FavoriteSong[]` in `localStorage`. The context is injected at the app root and consumed by three pages: `SearchPage` (star per result), `QueuePage` (star per queue row), and a new `FavoritesPage` (searchable list).

**Tech Stack:** React 18, TypeScript, Vite 5, react-router-dom v6, localStorage

## Global Constraints

- No new npm dependencies — use only what's already installed
- TypeScript strict mode is on — no `any`, no ignored type errors
- Inline styles only — no CSS files or CSS modules (matches the existing codebase)
- `addToQueue(item: { video_id, title, channel, thumbnail }, asUserId?: string)` — this is the exact signature from `QueueContext`
- TypeScript verification command: `cd frontend && npx tsc -p tsconfig.app.json --noEmit` — run after every task; expected output is no errors
- Favorites are stored under localStorage key `nextup_favorites`
- `duration` is `""` when favoriting from the Queue page (QueueItem has no duration field); the Favorites page omits duration display when it is empty

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `frontend/src/types.ts` | Add `FavoriteSong` interface |
| Create | `frontend/src/context/FavoritesContext.tsx` | Provider + `useFavorites` hook |
| Modify | `frontend/src/App.tsx` | Add `FavoritesProvider`, `/favorites` route |
| Modify | `frontend/src/components/shared/NavBar.tsx` | Add Favorites tab |
| Create | `frontend/src/components/mobile/FavoritesPage.tsx` | Searchable favorites list |
| Modify | `frontend/src/components/mobile/SearchPage.tsx` | Restructure result rows, add star button |
| Modify | `frontend/src/components/mobile/QueuePage.tsx` | Add `active` prop to `ActionButton`, add star to `QueueRow` |

---

### Task 1: Add `FavoriteSong` type

**Files:**
- Modify: `frontend/src/types.ts`

**Interfaces:**
- Produces: `FavoriteSong` — used by Tasks 2, 4, 5, 6

- [ ] **Step 1: Add the type**

Open `frontend/src/types.ts` and add this block after the `SearchResult` interface (after line 34):

```ts
export interface FavoriteSong {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc -p tsconfig.app.json --noEmit
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types.ts
git commit -m "feat: add FavoriteSong type"
```

---

### Task 2: Create FavoritesContext

**Files:**
- Create: `frontend/src/context/FavoritesContext.tsx`

**Interfaces:**
- Consumes: `FavoriteSong` from `../types`
- Produces:
  - `FavoritesProvider` — React component, wraps children
  - `useFavorites()` — returns `{ favorites: FavoriteSong[], isFavorited: (video_id: string) => boolean, toggleFavorite: (song: FavoriteSong) => void }`

- [ ] **Step 1: Create the file**

Create `frontend/src/context/FavoritesContext.tsx` with this exact content:

```tsx
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { FavoriteSong } from '../types';

const FAVORITES_KEY = 'nextup_favorites';

interface FavoritesContextValue {
  favorites: FavoriteSong[];
  isFavorited: (video_id: string) => boolean;
  toggleFavorite: (song: FavoriteSong) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteSong[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? (JSON.parse(raw) as FavoriteSong[]) : [];
    } catch {
      return [];
    }
  });

  const isFavorited = (video_id: string) =>
    favorites.some((f) => f.video_id === video_id);

  const toggleFavorite = (song: FavoriteSong) => {
    setFavorites((prev) => {
      const next = prev.some((f) => f.video_id === song.video_id)
        ? prev.filter((f) => f.video_id !== song.video_id)
        : [song, ...prev];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorited, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc -p tsconfig.app.json --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/FavoritesContext.tsx
git commit -m "feat: add FavoritesContext with localStorage persistence"
```

---

### Task 3: Wire FavoritesProvider into App, add route, add NavBar tab

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/shared/NavBar.tsx`

**Interfaces:**
- Consumes: `FavoritesProvider` from `./context/FavoritesContext`, `FavoritesPage` from `./components/mobile/FavoritesPage` (will exist after Task 4 — add import now, page will be created next)
- Note: TypeScript will error on the `FavoritesPage` import until Task 4 is done. That's fine — do Tasks 3 and 4 back-to-back and verify after Task 4.

- [ ] **Step 1: Update App.tsx**

Replace the full contents of `frontend/src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import { QueueProvider, useQueue } from './context/QueueContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { useWebSocket } from './hooks/useWebSocket';
import { LandingPage } from './components/mobile/LandingPage';
import { JoinPage } from './components/mobile/JoinPage';
import { SearchPage } from './components/mobile/SearchPage';
import { QueuePage } from './components/mobile/QueuePage';
import { UserPage } from './components/mobile/UserPage';
import { FavoritesPage } from './components/mobile/FavoritesPage';
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
        path="/favorites"
        element={
          <MobileLayout>
            <ProtectedRoute>
              <FavoritesPage />
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
      <FavoritesProvider>
        <QueueProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </QueueProvider>
      </FavoritesProvider>
    </UserProvider>
  );
}
```

- [ ] **Step 2: Update NavBar.tsx**

Replace the full contents of `frontend/src/components/shared/NavBar.tsx` with:

```tsx
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/search',    label: 'Search',    icon: '🔍' },
  { to: '/favorites', label: 'Favorites', icon: '⭐' },
  { to: '/queue',     label: 'Queue',     icon: '🎵' },
  { to: '/user',      label: 'Profile',   icon: '👤' },
];

export function NavBar() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#111',
      borderTop: '1px solid #222',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 0',
            textDecoration: 'none',
            color: isActive ? '#fff' : '#555',
            fontSize: '11px',
            fontWeight: isActive ? 700 : 400,
            gap: '2px',
            borderTop: isActive ? '2px solid #fff' : '2px solid transparent',
            transition: 'color 0.15s',
          })}
        >
          <span style={{ fontSize: '20px' }}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Hold off on TypeScript check — do Task 4 first**

`App.tsx` now imports `FavoritesPage` which doesn't exist yet. Proceed directly to Task 4, then run the TypeScript check there.

- [ ] **Step 4: Commit (after Task 4 TypeScript check passes)**

```bash
git add frontend/src/App.tsx frontend/src/components/shared/NavBar.tsx
git commit -m "feat: wire FavoritesProvider, add /favorites route and nav tab"
```

---

### Task 4: Create FavoritesPage

**Files:**
- Create: `frontend/src/components/mobile/FavoritesPage.tsx`

**Interfaces:**
- Consumes:
  - `useFavorites()` → `{ favorites: FavoriteSong[], isFavorited, toggleFavorite }`
  - `useQueue()` → `{ addToQueue: (item: { video_id, title, channel, thumbnail }, asUserId?: string) => Promise<void> }`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/mobile/FavoritesPage.tsx` with this exact content:

```tsx
import { useState } from 'react';
import { useFavorites } from '../../context/FavoritesContext';
import { useQueue } from '../../context/QueueContext';
import type { FavoriteSong } from '../../types';

export function FavoritesPage() {
  const { favorites, toggleFavorite } = useFavorites();
  const { addToQueue } = useQueue();
  const [query, setQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const filtered = query.trim()
    ? favorites.filter(
        (f) =>
          f.title.toLowerCase().includes(query.toLowerCase()) ||
          f.channel.toLowerCase().includes(query.toLowerCase()),
      )
    : favorites;

  const handleAdd = async (song: FavoriteSong) => {
    if (addedIds.has(song.video_id)) return;
    try {
      await addToQueue({
        video_id: song.video_id,
        title: song.title,
        channel: song.channel,
        thumbnail: song.thumbnail,
      });
      setAddedIds((prev) => new Set(prev).add(song.video_id));
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(song.video_id);
          return next;
        });
      }, 1500);
    } catch {
      // silently fail
    }
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#000',
        padding: '16px 16px 12px',
        borderBottom: '1px solid #222',
        zIndex: 10,
      }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search favorites..."
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '16px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ padding: '8px 0' }}>
        {favorites.length === 0 && (
          <p style={{ textAlign: 'center', color: '#444', padding: '48px 16px', fontSize: '15px', lineHeight: 1.6 }}>
            You haven't favorited any songs yet.{'\n'}Tap ☆ next to a song in Search or Queue to save it.
          </p>
        )}
        {favorites.length > 0 && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: '#555', padding: '32px 0' }}>
            No favorites match your search.
          </p>
        )}

        {filtered.map((song) => {
          const added = addedIds.has(song.video_id);
          return (
            <div
              key={song.video_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderBottom: '1px solid #1a1a1a',
              }}
            >
              <img
                src={song.thumbnail}
                alt=""
                style={{ width: '80px', height: '45px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {song.title}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {song.channel}{song.duration ? ` · ${song.duration}` : ''}
                </p>
              </div>
              <button
                onClick={() => toggleFavorite(song)}
                style={{
                  flexShrink: 0,
                  padding: '6px 8px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#FFD700',
                }}
                aria-label="Remove from favorites"
              >
                ★
              </button>
              <button
                onClick={() => handleAdd(song)}
                disabled={added}
                style={{
                  flexShrink: 0,
                  padding: '6px 12px',
                  background: added ? '#2a5a2a' : '#222',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: added ? '#4ade80' : '#fff',
                  border: 'none',
                  cursor: added ? 'default' : 'pointer',
                }}
              >
                {added ? 'Added ✓' : 'Add'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript (covers Tasks 3 + 4)**

```bash
cd frontend && npx tsc -p tsconfig.app.json --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit Task 3 files, then this file**

```bash
git add frontend/src/App.tsx frontend/src/components/shared/NavBar.tsx
git commit -m "feat: wire FavoritesProvider, add /favorites route and nav tab"

git add frontend/src/components/mobile/FavoritesPage.tsx
git commit -m "feat: add FavoritesPage with client-side search and add-to-queue"
```

---

### Task 5: Add star button to SearchPage

**Files:**
- Modify: `frontend/src/components/mobile/SearchPage.tsx`

**Interfaces:**
- Consumes: `useFavorites()` → `{ isFavorited: (video_id: string) => boolean, toggleFavorite: (song: FavoriteSong) => void }`

**Key change:** The existing result row is a single `<button>` element wrapping the whole row. Nested `<button>` elements are invalid HTML, so the outer element must change to a `<div>`. The "Add" label becomes its own `<button>`. The layout and styles stay the same.

- [ ] **Step 1: Add the import**

At the top of `frontend/src/components/mobile/SearchPage.tsx`, add `useFavorites` to the imports:

```tsx
import { useFavorites } from '../../context/FavoritesContext';
```

(Add this line after the existing imports, before the `const API_BASE` line.)

- [ ] **Step 2: Destructure useFavorites inside SearchPage**

Inside the `SearchPage` function body, after the existing `const { addToQueue, registerUser, state } = useQueue();` line, add:

```tsx
const { isFavorited, toggleFavorite } = useFavorites();
```

- [ ] **Step 3: Replace the result rows**

Find the `{results.map((r) => {` block (currently returns a `<button>` as the row root) and replace the entire map block with:

```tsx
{results.map((r) => {
  const added = addedIds.has(r.video_id);
  const favorited = isFavorited(r.video_id);
  return (
    <div
      key={r.video_id}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: added ? '#1a2a1a' : 'transparent',
        borderBottom: '1px solid #1a1a1a',
        boxSizing: 'border-box',
      }}
    >
      <img
        src={r.thumbnail}
        alt=""
        style={{ width: '80px', height: '45px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.title}
        </p>
        <p style={{ margin: 0, fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.channel} · {r.duration}
        </p>
      </div>
      <button
        onClick={() => toggleFavorite({ video_id: r.video_id, title: r.title, channel: r.channel, thumbnail: r.thumbnail, duration: r.duration })}
        style={{
          flexShrink: 0,
          padding: '6px 8px',
          background: 'transparent',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          color: favorited ? '#FFD700' : '#444',
        }}
        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {favorited ? '★' : '☆'}
      </button>
      <button
        onClick={() => handleAdd(r)}
        disabled={added}
        style={{
          flexShrink: 0,
          padding: '6px 12px',
          background: added ? '#2a5a2a' : '#222',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: added ? '#4ade80' : '#fff',
          border: 'none',
          cursor: added ? 'default' : 'pointer',
        }}
      >
        {added ? 'Added ✓' : 'Add'}
      </button>
    </div>
  );
})}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc -p tsconfig.app.json --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/mobile/SearchPage.tsx
git commit -m "feat: add star favorite button to search results"
```

---

### Task 6: Add star button to QueuePage

**Files:**
- Modify: `frontend/src/components/mobile/QueuePage.tsx`

**Interfaces:**
- Consumes: `useFavorites()` → `{ isFavorited: (video_id: string) => boolean, toggleFavorite: (song: FavoriteSong) => void }`

**Key changes:**
1. `ActionButton` gets an optional `active?: boolean` prop for gold/highlighted styling
2. `QueueRow` calls `useFavorites()` and renders a Favorite toggle button in the action row

- [ ] **Step 1: Add the import**

At the top of `frontend/src/components/mobile/QueuePage.tsx`, add:

```tsx
import { useFavorites } from '../../context/FavoritesContext';
```

(Add after the existing imports.)

- [ ] **Step 2: Add `active` prop to `ActionButton`**

Find the `ActionButton` function and replace it with:

```tsx
function ActionButton({
  label,
  onClick,
  disabled = false,
  danger = false,
  active = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 10px',
        fontSize: '12px',
        fontWeight: 600,
        background: disabled ? '#111' : danger ? '#2a0a0a' : active ? '#2a2a00' : '#1a1a1a',
        color: disabled ? '#333' : danger ? '#ff6b6b' : active ? '#FFD700' : '#ccc',
        border: `1px solid ${disabled ? '#222' : danger ? '#5a1a1a' : active ? '#5a5a00' : '#333'}`,
        borderRadius: '5px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 3: Update `QueueRow` to use favorites**

Find the `QueueRow` function and replace it with:

```tsx
function QueueRow({ item, isPlaying, isFirst, isLast, onMove, onDelete }: QueueRowProps) {
  const { isFavorited, toggleFavorite } = useFavorites();
  const favorited = isFavorited(item.video_id);

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid #1a1a1a',
      background: isPlaying ? '#0a1a0a' : 'transparent',
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <img
          src={item.thumbnail}
          alt=""
          style={{ width: '72px', height: '40px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {isPlaying && (
            <span style={{
              display: 'inline-block',
              fontSize: '10px',
              fontWeight: 700,
              color: '#4ade80',
              background: '#0d2b0d',
              padding: '2px 6px',
              borderRadius: '4px',
              marginBottom: '4px',
              letterSpacing: '0.05em',
            }}>
              NOW PLAYING
            </span>
          )}
          <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </p>
          <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.channel}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: item.added_by_color }}>
            {item.added_by_name}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
        <ActionButton label="⤒ Top"    onClick={() => onMove('top')}    disabled={isFirst} />
        <ActionButton label="▲ Up"     onClick={() => onMove('up')}     disabled={isFirst} />
        <ActionButton label="▼ Down"   onClick={() => onMove('down')}   disabled={isLast}  />
        <ActionButton label="⤓ Bottom" onClick={() => onMove('bottom')} disabled={isLast}  />
        <ActionButton
          label={favorited ? '★ Favorited' : '☆ Favorite'}
          onClick={() => toggleFavorite({
            video_id: item.video_id,
            title: item.title,
            channel: item.channel,
            thumbnail: item.thumbnail,
            duration: '',
          })}
          active={favorited}
        />
        <ActionButton label="✕ Remove" onClick={onDelete} danger />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc -p tsconfig.app.json --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/mobile/QueuePage.tsx
git commit -m "feat: add star favorite button to queue rows"
```
