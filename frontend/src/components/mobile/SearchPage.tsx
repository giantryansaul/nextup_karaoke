import { useState, useEffect, useRef } from 'react';
import { useQueue } from '../../context/QueueContext';
import { useUser } from '../../context/UserContext';
import { PRESET_COLORS } from '../../types';
import type { SearchResult, User } from '../../types';
import { GuestPickerModal } from './GuestPickerModal';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const SEARCH_TIMEOUT_MS = 10_000;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function pickUnusedColor(usedColors: Set<string>): string {
  const available = PRESET_COLORS.filter((c) => !usedColors.has(c.hex));
  const pool = available.length > 0 ? available : PRESET_COLORS;
  return pool[Math.floor(Math.random() * pool.length)].hex;
}

export function SearchPage() {
  const { addToQueue, registerUser, state } = useQueue();
  const { user } = useUser();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [showDrmModal, setShowDrmModal] = useState(false);
  const [pickingFor, setPickingFor] = useState<User | null>(null);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError('');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.results ?? []);
      } catch (e) {
        clearTimeout(timeoutId);
        if (e instanceof Error && e.name === 'AbortError') {
          setError('Search timed out. Please try again.');
        } else {
          setError('Search unavailable. Please try again.');
        }
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleAdd = async (result: SearchResult) => {
    if (addedIds.has(result.video_id)) return;
    try {
      await addToQueue(
        { video_id: result.video_id, title: result.title, channel: result.channel, thumbnail: result.thumbnail },
        pickingFor?.id,
      );
      setAddedIds((prev) => new Set(prev).add(result.video_id));
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(result.video_id);
          return next;
        });
      }, 1500);
      if (pickingFor) setPickingFor(null);
    } catch {
      // silently fail — could show a toast here
    }
  };

  const handleAddNewGuest = async (name: string) => {
    const usedColors = new Set(Object.values(state?.users ?? {}).map((u) => u.color));
    const color = pickUnusedColor(usedColors);
    const newUser = await registerUser(name, color);
    setPickingFor(newUser);
    setShowGuestPicker(false);
  };

  const partyUsers = Object.values(state?.users ?? {}).filter((u) => u.id !== user?.id);

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
          placeholder="Search for a song..."
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

        {pickingFor ? (
          <div style={{
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            background: hexToRgba(pickingFor.color, 0.12),
            border: `1px solid ${hexToRgba(pickingFor.color, 0.35)}`,
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#bbb' }}>
              Picking for{' '}
              <span style={{ color: pickingFor.color, fontWeight: 700 }}>{pickingFor.name}</span>
            </span>
            <button
              onClick={() => setPickingFor(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0 0 0 12px',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowGuestPicker(true)}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#555',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Add for someone else
          </button>
        )}
      </div>

      <div style={{ padding: '8px 0' }}>
        {loading && (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ color: '#555', margin: '0 0 10px' }}>Searching...</p>
            <p style={{ color: '#3a3a3a', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
              We scan YouTube to find videos that actually work in this app — some may be filtered out if the owner has disabled embedding. Hang tight.
            </p>
          </div>
        )}
        {error && (
          <p style={{ textAlign: 'center', color: '#ff6b6b', padding: '32px 16px' }}>{error}</p>
        )}
        {!loading && !error && results.length === 0 && query.trim() && (
          <p style={{ textAlign: 'center', color: '#555', padding: '32px 0' }}>No results found</p>
        )}
        {!loading && !error && results.length === 0 && !query.trim() && (
          <p style={{ textAlign: 'center', color: '#444', padding: '48px 16px', fontSize: '15px' }}>
            Search for a song to add it to the karaoke queue
          </p>
        )}

        {results.map((r) => {
          const added = addedIds.has(r.video_id);
          return (
            <button
              key={r.video_id}
              onClick={() => handleAdd(r)}
              disabled={added}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: added ? '#1a2a1a' : 'transparent',
                border: 'none',
                borderBottom: '1px solid #1a1a1a',
                color: '#fff',
                textAlign: 'left',
                cursor: added ? 'default' : 'pointer',
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
              <span style={{
                flexShrink: 0,
                padding: '6px 12px',
                background: added ? '#2a5a2a' : '#222',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: added ? '#4ade80' : '#fff',
              }}>
                {added ? 'Added ✓' : 'Add'}
              </span>
            </button>
          );
        })}

        {!loading && results.length > 0 && (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <button
              onClick={() => setShowDrmModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#555',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Not finding what you want?
            </button>
          </div>
        )}
      </div>

      {showGuestPicker && (
        <GuestPickerModal
          partyUsers={partyUsers}
          onPick={(u) => { setPickingFor(u); setShowGuestPicker(false); }}
          onAddNew={handleAddNewGuest}
          onClose={() => setShowGuestPicker(false)}
        />
      )}

      {showDrmModal && (
        <div
          onClick={() => setShowDrmModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 200,
            padding: '0',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: '20px 20px 0 0',
              padding: '28px 24px 40px',
              width: '100%',
              maxWidth: '480px',
            }}
          >
            <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
            <p style={{ fontSize: '20px', margin: '0 0 12px', fontWeight: 800 }}>Why can't I find some songs?</p>
            <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.6, margin: '0 0 16px' }}>
              Many YouTube videos — especially from major artists and labels — have embedding disabled by the video owner. This is a DRM restriction, not a bug.
            </p>
            <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.6, margin: '0 0 20px' }}>
              This app automatically filters those out so you don't queue something that won't play. That's why some searches return fewer results than you'd expect.
            </p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#ccc', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tips</p>
            <ul style={{ fontSize: '14px', color: '#999', lineHeight: 1.8, margin: '0 0 28px', paddingLeft: '20px' }}>
              <li>Try a different karaoke channel's version of the song</li>
              <li>Search with terms like "karaoke", "backing track", or "instrumental"</li>
              <li>Fan-uploaded versions are often embeddable when official ones aren't</li>
            </ul>
            <button
              onClick={() => setShowDrmModal(false)}
              style={{
                width: '100%',
                padding: '14px',
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
