# Countdown Overlay & Queue Cleanup Design

**Date:** 2026-07-13  
**Status:** Approved for planning

## Goal

Remove the early-end skip that cuts videos short, add a “Next Up in N” countdown overlay during the last 5 seconds of a song (when another song is queued), align “Up Next” copy with the NextUp brand, and remove End Party from the mobile queue while keeping it on the display.

## Decisions

| Topic | Choice |
|-------|--------|
| Implementation locus | Client-only in `YouTubePlayer` / display view (no backend or WebSocket changes) |
| Empty queue | No countdown if nothing is next |
| Handoff style | Overlay only — video keeps playing; next song starts on natural `ENDED` |
| Overlay style | Subtle badge (matches existing playback-rate pill) |
| End Party | Display only; remove from mobile `QueuePage` |

## Behavior

### Remove early end

- Delete `EARLY_END_THRESHOLD` and the interval that calls `onVideoEnded` when `duration - current <= 5`.
- Advance the queue only when YouTube reports `ENDED`, or via the existing embed-error skip path.

### Countdown overlay

- While the player is in `PLAYING` state, poll remaining time.
- If remaining time is ≤ 5 seconds **and** another song is queued, show top-right overlay text: `Next Up in N`, where `N` is `ceil(remaining)` clipped to the range 1–5.
- Hide the overlay when:
  - remaining time is > 5 seconds,
  - player is not playing (e.g. paused / buffering / ended),
  - there is no next song,
  - the video ends / advances.
- Do **not** delay or insert a gap between songs. The overlay is informational only.

### Copy & End Party

- Display sidebar heading: change **Up Next** → **Next Up**.
- Mobile queue: remove the End Party button and its confirmation modal (and related local state / unused `endParty` wiring from that page).
- Display sidebar End Party control remains unchanged.

## Architecture

```
DisplayView
  ├─ computes hasNextSong from session queue + now_playing
  └─ YouTubePlayer(hasNextSong, …)
        ├─ on PLAYING: poll getCurrentTime / getDuration
        ├─ early-end removed → only ENDED (or embed error) advances
        └─ renders subtle “Next Up in N” badge (top-right)

QueueSidebar — label “Next Up”; End Party kept
QueuePage (mobile) — End Party UI removed
```

No API, session model, or WebSocket protocol changes.

## Components & data flow

| File | Change |
|------|--------|
| `frontend/src/components/display/YouTubePlayer.tsx` | Remove early-end; add remaining-time poll for overlay; accept `hasNextSong`; render badge |
| `frontend/src/components/display/DisplayView.tsx` | Pass `hasNextSong` into player |
| `frontend/src/components/display/QueueSidebar.tsx` | Rename “Up Next” → “Next Up” |
| `frontend/src/components/mobile/QueuePage.tsx` | Remove End Party button, modal, and unused hooks |

`endParty` remains available on `QueueContext` for any non-mobile callers; display continues to end parties via its existing `DELETE /api/parties/:code` path.

## Overlay UI

- Position: absolute, top-right of the video area (mirror rate badge which is top-left).
- Style: dark translucent background, light border, white bold text — same visual language as the playback-rate badge.
- Copy: `Next Up in 5` … `Next Up in 1` (no “0”).

## Error handling & edge cases

- Short videos (< 5s): show countdown for the available remaining window while `hasNextSong` is true.
- Playback rate ≠ 1×: use video timeline (`getDuration` − `getCurrentTime`), not wall clock.
- Queue empties during the last 5s (e.g. next song deleted): hide countdown immediately when `hasNextSong` becomes false.
- Embed-error auto-skip: no countdown required; existing skip behavior unchanged.

## Testing (manual)

1. Song with a queued next track: last ~5s show `Next Up in N` counting down; song plays to natural end; next track starts.
2. Last song in queue: no countdown in the final 5s; ends and shows waiting state.
3. Pause during countdown window: overlay hides while not playing; resumes correctly if still in window after play.
4. Mobile queue page: no End Party control; Clear All and other controls unchanged.
5. Display sidebar: still has End Party; heading reads **Next Up**.
6. Confirm videos no longer cut ~5 seconds early.
