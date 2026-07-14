# Countdown Overlay & Queue Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove early video cut-off, show a top-right “Next Up in N” countdown during the last 5 seconds when another song is queued, rename display “Up Next” to “Next Up”, and remove End Party from the mobile queue.

**Architecture:** Client-only changes on the display player. `DisplayView` passes `hasNextSong` into `YouTubePlayer`. While PLAYING, the player polls remaining time and renders a subtle top-right badge; videos advance only on natural YouTube `ENDED` (or embed-error skip). Sidebar copy and mobile End Party cleanup are separate small UI edits.

**Tech Stack:** React 19, TypeScript, Vite 5, YouTube IFrame API (`@types/youtube`)

## Global Constraints

- No new npm dependencies
- TypeScript strict — no `any`, no ignored type errors
- Inline styles only (match existing codebase)
- TypeScript verification: `cd frontend && npx tsc -p tsconfig.app.json --noEmit` — expect no output
- Do **not** change backend routes, WebSocket protocol, or `QueueContext.endParty` itself (display already ends parties via `DELETE`)
- Leave `skipToNearEndSignal` / debug seek alone — out of scope

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `frontend/src/components/display/YouTubePlayer.tsx` | Remove early-end; poll remaining time; render countdown badge; accept `hasNextSong` |
| Modify | `frontend/src/components/display/DisplayView.tsx` | Compute and pass `hasNextSong` |
| Modify | `frontend/src/components/display/QueueSidebar.tsx` | Rename “Up Next” → “Next Up” |
| Modify | `frontend/src/components/mobile/QueuePage.tsx` | Remove End Party button, modal, and unused wiring |

---

### Task 1: Remove early-end and add countdown overlay in `YouTubePlayer`

**Files:**
- Modify: `frontend/src/components/display/YouTubePlayer.tsx`

**Spec coverage:** Remove early end; countdown overlay behavior + subtle badge UI; video-timeline remaining time

- [ ] **Step 1: Replace the early-end threshold with countdown helpers and extend props**

At the top of `frontend/src/components/display/YouTubePlayer.tsx`, **delete** `const EARLY_END_THRESHOLD = 5;` and add:

```ts
const COUNTDOWN_WINDOW_S = 5;
const REMAINING_POLL_MS = 250;

/** Returns 1–5 for the overlay, or null when hidden. */
export function nextUpCountdownSeconds(
  remainingSeconds: number,
  hasNextSong: boolean,
): number | null {
  if (!hasNextSong) return null;
  if (!(remainingSeconds > 0) || remainingSeconds > COUNTDOWN_WINDOW_S) return null;
  return Math.min(COUNTDOWN_WINDOW_S, Math.max(1, Math.ceil(remainingSeconds)));
}
```

Update the props interface and destructuring to include `hasNextSong`:

```ts
interface YouTubePlayerProps {
  nowPlayingVideoId: string | null;
  isPaused: boolean;
  restartSignal: number;
  skipToNearEndSignal: number;
  playbackRate: number;
  hasNextSong: boolean;
  onVideoEnded: () => void;
}

export function YouTubePlayer({
  nowPlayingVideoId,
  isPaused,
  restartSignal,
  skipToNearEndSignal,
  playbackRate,
  hasNextSong,
  onVideoEnded,
}: YouTubePlayerProps) {
```

- [ ] **Step 2: Swap early-end interval for remaining-time polling + overlay state**

Inside the component:

1. Rename `earlyEndIntervalRef` → `remainingPollRef` (update every clear/set site).
2. Add `const hasNextSongRef = useRef(hasNextSong);` and keep it current each render: `hasNextSongRef.current = hasNextSong;`.
3. Add state: `const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);`.
4. In the player `onStateChange` handler, replace the early-end block with:

```ts
onStateChange: (event: YT.OnStateChangeEvent) => {
  if (event.data === YT.PlayerState.PLAYING) {
    if (remainingPollRef.current) clearInterval(remainingPollRef.current);
    remainingPollRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const duration = player.getDuration();
      const current = player.getCurrentTime();
      if (!(duration > 0)) {
        setCountdownSeconds(null);
        return;
      }
      const remaining = duration - current;
      setCountdownSeconds(
        nextUpCountdownSeconds(remaining, hasNextSongRef.current),
      );
    }, REMAINING_POLL_MS);
  } else {
    if (remainingPollRef.current) clearInterval(remainingPollRef.current);
    remainingPollRef.current = null;
    setCountdownSeconds(null);
  }
  if (event.data === YT.PlayerState.ENDED) {
    setCountdownSeconds(null);
    onEndedRef.current();
  }
},
```

5. When clearing the poll on video load / unmount, also `setCountdownSeconds(null)`.
6. **Do not** call `onEndedRef.current()` from the poll — only from `ENDED` (and existing embed-error path).

- [ ] **Step 3: Render the subtle top-right badge**

Add this overlay next to the existing rate badge (top-left), matching its visual language, only when `countdownSeconds !== null`:

```tsx
{countdownSeconds !== null && started && nowPlayingVideoId && !showOverlay && (
  <div style={{
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 4,
    padding: '8px 14px',
    background: 'rgba(0,0,0,0.65)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: '0.02em',
    pointerEvents: 'none',
  }}>
    Next Up in {countdownSeconds}
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc -p tsconfig.app.json --noEmit
```

Expected: error that `DisplayView` is missing `hasNextSong` (or similar) — fixed in Task 2. If other errors appear in `YouTubePlayer.tsx` itself, fix those before continuing. If tsc only reports the missing prop at the call site, proceed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/display/YouTubePlayer.tsx
git commit -m "feat: replace early-end cut with Next Up countdown overlay"
```

---

### Task 2: Pass `hasNextSong` from `DisplayView`

**Files:**
- Modify: `frontend/src/components/display/DisplayView.tsx`

**Spec coverage:** `hasNextSong` from session queue + now playing

- [ ] **Step 1: Compute and pass the prop**

After `nowPlayingItem` is defined, add:

```ts
const hasNextSong = queue.some((item) => item.id !== nowPlayingId);
```

Pass it into `YouTubePlayer`:

```tsx
<YouTubePlayer
  nowPlayingVideoId={nowPlayingItem?.video_id ?? null}
  isPaused={isPaused}
  restartSignal={restartSignal}
  skipToNearEndSignal={skipToNearEndSignal}
  playbackRate={playbackRate}
  hasNextSong={hasNextSong}
  onVideoEnded={handleVideoEnded}
/>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc -p tsconfig.app.json --noEmit
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/display/DisplayView.tsx
git commit -m "feat: pass hasNextSong into display YouTube player"
```

---

### Task 3: Rename display sidebar “Up Next” → “Next Up”

**Files:**
- Modify: `frontend/src/components/display/QueueSidebar.tsx`

**Spec coverage:** Copy alignment with NextUp theme

- [ ] **Step 1: Rename the label**

Change the upcoming section heading text from `Up Next` to `Next Up` (keep the comment or update it to `{/* Next Up */}` for consistency). The visible `<p>` text must be exactly `Next Up`.

- [ ] **Step 2: Verify no other “Up Next” strings remain in display components**

```bash
cd frontend && rg -n "Up Next" src/components/display
```

Expected: no matches (or only unrelated comments if any — should be none).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/display/QueueSidebar.tsx
git commit -m "fix: rename display queue heading to Next Up"
```

---

### Task 4: Remove End Party from mobile `QueuePage`

**Files:**
- Modify: `frontend/src/components/mobile/QueuePage.tsx`

**Spec coverage:** End Party display-only; mobile cleanup

- [ ] **Step 1: Remove End Party wiring and UI**

In `frontend/src/components/mobile/QueuePage.tsx`:

1. Remove `endParty` from the `useQueue()` destructure.
2. Remove `const [showEndPartyModal, setShowEndPartyModal] = useState(false);`.
3. Remove `handleEndPartyConfirm` entirely.
4. Remove the “End Party button” block (the bordered section with `✕ End Party`).
5. Remove the “End Party confirmation modal” block (`showEndPartyModal && (...)`).

Leave Clear All and remote controls unchanged. Do **not** modify `QueueContext` or display `QueueSidebar` End Party.

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc -p tsconfig.app.json --noEmit
```

Expected: no output (no errors).

- [ ] **Step 3: Grep to confirm mobile page no longer references End Party**

```bash
cd frontend && rg -n "End Party|endParty|showEndPartyModal" src/components/mobile/QueuePage.tsx
```

Expected: no matches.

```bash
cd frontend && rg -n "End Party" src/components/display/QueueSidebar.tsx
```

Expected: still matches (button remains on display).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/mobile/QueuePage.tsx
git commit -m "fix: remove End Party control from mobile queue"
```

---

### Task 5: Manual verification checklist

**Files:** none (verification only)

- [ ] **Step 1: Build**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 2: Manual QA against the spec**

With display + at least one phone joined:

1. Queue two songs; play the first — last ~5s show `Next Up in N` counting down top-right; song finishes fully (not cut early); next song starts.
2. Play the last remaining song — no countdown in the final 5s.
3. During the countdown window, pause — overlay hides; resume while still in window — overlay returns with correct `N`.
4. During the countdown window, delete the upcoming song from another device — overlay disappears.
5. Mobile queue page — no End Party button; Clear All still works.
6. Display sidebar — heading **Next Up**; End Party still present and works.

- [ ] **Step 3: Commit only if Step 2 found fixes**

If verification required code fixes, commit those separately with a clear message (e.g. `fix: hide countdown when next song cleared`). If nothing to fix, no empty commit.

---

## Spec Coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Remove early-end threshold / early `onVideoEnded` | Task 1 |
| Natural `ENDED` advance only (+ embed-error path kept) | Task 1 |
| Countdown last 5s when next song queued | Tasks 1–2 |
| Overlay text `Next Up in N`, top-right, subtle badge | Task 1 |
| No countdown when queue empty of next songs | Tasks 1–2 |
| Overlay only — no between-song delay | Task 1 |
| Video timeline remaining (not wall clock) | Task 1 |
| “Up Next” → “Next Up” on display | Task 3 |
| Remove mobile End Party; keep display | Task 4 |
| Manual QA list | Task 5 |
