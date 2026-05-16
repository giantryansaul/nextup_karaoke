import { useState, useEffect, useRef } from 'react';
import { useQueue } from '../../context/QueueContext';
import type { SearchResult } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function SearchPage() {
  const { addToQueue } = useQueue();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
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
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setError('Search unavailable. Please try again.');
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
      await addToQueue({
        video_id: result.video_id,
        title: result.title,
        channel: result.channel,
        thumbnail: result.thumbnail,
      });
      setAddedIds((prev) => new Set(prev).add(result.video_id));
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(result.video_id);
          return next;
        });
      }, 1500);
    } catch {
      // silently fail — could show a toast here
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
      </div>

      <div style={{ padding: '8px 0' }}>
        {loading && (
          <p style={{ textAlign: 'center', color: '#555', padding: '32px 0' }}>Searching...</p>
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
      </div>
    </div>
  );
}
