# Favorites Feature Design
_Date: 2026-06-20_

## Overview

Users can favorite songs from the Search page and Queue page. Favorites are stored in `localStorage` per device — naturally separate per person since everyone uses their own phone. A new Favorites tab in the bottom nav shows a searchable, scrollable list of saved songs. The data shape and hook interface are designed for a clean future migration to a backend API.

---

## Data

### New type: `FavoriteSong` (in `types.ts`)

```ts
interface FavoriteSong {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
}
```

Stored as `JSON` in `localStorage` under the key `nextup_favorites`.

---

## State Management

### New: `FavoritesContext.tsx`

A React context provider (alongside `UserContext` and `QueueContext`) that wraps the full app in `App.tsx`.

**Exposed via `useFavorites()`:**
- `favorites: FavoriteSong[]` — full list, ordered by most-recently-added first
- `isFavorited(video_id: string): boolean`
- `toggleFavorite(song: FavoriteSong): void` — adds if not present, removes if present

**Migration path:** When a backend is added, only the provider internals change (swap `localStorage` reads/writes for API calls). The hook interface stays identical at all call sites.

---

## Routing & Navigation

- `NavBar.tsx`: add a 4th tab — `⭐ Favorites` → `/favorites`
- `App.tsx`: add `/favorites` protected route wrapped in `MobileLayout` + `ProtectedRoute`, rendering `FavoritesPage`
- `FavoritesProvider` added to the provider tree in `App.tsx`

---

## FavoritesPage

New file: `frontend/src/components/mobile/FavoritesPage.tsx`

Mirrors the SearchPage layout:

- **Sticky header** with a text input that filters the favorites list client-side (no API calls — all data is in memory from context)
- **Song rows**: thumbnail · title · channel — same visual style as search results
  - Filled gold star button (★) on the left → clicking unfavorites the song and removes it from the list
  - **Add** button on the right → calls `addToQueue` from `useQueue` to add to the live queue
- **Empty state** (no favorites): `"You haven't favorited any songs yet. Tap ☆ next to a song in Search or Queue to save it."`
- **Empty state** (search filter returns nothing): `"No favorites match your search."`
- No "Add for someone else" — keep this page simple

---

## Search Page Changes (`SearchPage.tsx`)

Each result row gets a star button between the song info and the **Add** button:

- ☆ (hollow, dimmed) → not favorited. Clicking favorites it; star fills gold.
- ★ (filled, gold) → already favorited. Clicking unfavorites it; star goes hollow.

The star is independent of the Add button — you can favorite without adding to queue.

---

## Queue Page Changes (`QueuePage.tsx`)

The `QueueRow` action button row gets a **☆ Favorite** / **★ Favorited** toggle button alongside the existing Top / Up / Down / Bottom / Remove buttons.

- Toggles the same way as the Search page star
- Anyone can favorite any queued song, regardless of who added it
- Follows the same `ActionButton` visual style already used in that row

---

## Constraints & Notes

- Favorites are **not** tied to a user ID — they are device-wide in `localStorage`. Two users on separate devices have completely separate favorites. Two users sharing one device would share favorites (acceptable edge case for now; backend migration resolves this).
- Favorites persist across party sessions — they survive joining/leaving parties.
- The Favorites tab is a **protected route** — only accessible after joining a party (same as Search, Queue, Profile).
- No "Add for someone else" on the Favorites page.
