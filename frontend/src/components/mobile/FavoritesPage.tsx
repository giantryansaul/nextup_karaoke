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
