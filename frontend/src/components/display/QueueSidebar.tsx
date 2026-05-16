import { QRCodeSVG } from 'qrcode.react';
import type { QueueItem } from '../../types';

interface QueueSidebarProps {
  queue: QueueItem[];
  nowPlayingId: string | null;
  isPaused: boolean;
  appUrl: string;
  onPause: () => void;
  onSkip: () => void;
}

function getVisibleItems(upcoming: QueueItem[]): { items: QueueItem[]; hasEllipsis: boolean } {
  if (upcoming.length <= 6) return { items: upcoming, hasEllipsis: false };
  return {
    items: [...upcoming.slice(0, 3), ...upcoming.slice(-3)],
    hasEllipsis: true,
  };
}

export function QueueSidebar({ queue, nowPlayingId, isPaused, appUrl, onPause, onSkip }: QueueSidebarProps) {
  const nowPlaying = queue.find((i) => i.id === nowPlayingId) ?? null;
  const upcoming = queue.filter((i) => i.id !== nowPlayingId);
  const { items, hasEllipsis } = getVisibleItems(upcoming);
  const hasNowPlaying = nowPlayingId !== null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0a0a0a',
      borderLeft: '1px solid #1a1a1a',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Queue
        </h2>
        {/* Remote controls */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onPause}
            disabled={!hasNowPlaying}
            style={{
              flex: 1,
              padding: '8px 4px',
              background: !hasNowPlaying ? '#111' : isPaused ? '#1a2a1a' : '#1a1a2a',
              color: !hasNowPlaying ? '#333' : isPaused ? '#4ade80' : '#88aaff',
              border: `1px solid ${!hasNowPlaying ? '#1a1a1a' : isPaused ? '#2a5a2a' : '#2a2a5a'}`,
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: !hasNowPlaying ? 'not-allowed' : 'pointer',
            }}
          >
            {isPaused ? '▶ Continue' : '⏸ Pause'}
          </button>
          <button
            onClick={onSkip}
            disabled={!hasNowPlaying}
            style={{
              flex: 1,
              padding: '8px 4px',
              background: !hasNowPlaying ? '#111' : '#1a1a1a',
              color: !hasNowPlaying ? '#333' : '#ccc',
              border: `1px solid ${!hasNowPlaying ? '#1a1a1a' : '#2a2a2a'}`,
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: !hasNowPlaying ? 'not-allowed' : 'pointer',
            }}
          >
            ⏭ Skip
          </button>
        </div>
      </div>

      {/* Now Playing */}
      {nowPlaying && (
        <div style={{ padding: '12px', borderBottom: '1px solid #1a1a1a', flexShrink: 0, background: '#0d1a0d' }}>
          <p style={{ margin: '0 0 6px', fontSize: '9px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Now Playing
          </p>
          <QueueEntry item={nowPlaying} />
        </div>
      )}

      {/* Up Next */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {upcoming.length > 0 && (
          <p style={{ margin: '10px 12px 6px', fontSize: '9px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Up Next
          </p>
        )}
        {items.slice(0, hasEllipsis ? 3 : items.length).map((item) => (
          <div key={item.id} style={{ padding: '8px 12px', borderBottom: '1px solid #111' }}>
            <QueueEntry item={item} />
          </div>
        ))}
        {hasEllipsis && (
          <div style={{ padding: '8px 12px', textAlign: 'center' }}>
            <span style={{ color: '#444', fontSize: '18px', letterSpacing: '4px' }}>···</span>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#444' }}>{upcoming.length - 6} more</p>
          </div>
        )}
        {hasEllipsis && items.slice(3).map((item) => (
          <div key={item.id} style={{ padding: '8px 12px', borderBottom: '1px solid #111' }}>
            <QueueEntry item={item} />
          </div>
        ))}
        {upcoming.length === 0 && !nowPlaying && (
          <p style={{ textAlign: 'center', color: '#333', padding: '24px 12px', fontSize: '13px' }}>
            Queue is empty
          </p>
        )}
      </div>

      {/* QR Code */}
      <div style={{
        padding: '16px 12px',
        borderTop: '1px solid #1a1a1a',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <p style={{ margin: 0, fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Scan to join
        </p>
        <QRCodeSVG
          value={appUrl}
          size={120}
          bgColor="#000000"
          fgColor="#ffffff"
          level="M"
        />
        <p style={{ margin: 0, fontSize: '10px', color: '#555', wordBreak: 'break-all', textAlign: 'center' }}>
          {appUrl}
        </p>
      </div>
    </div>
  );
}

function QueueEntry({ item }: { item: QueueItem }) {
  return (
    <div>
      <p style={{
        margin: '0 0 2px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#e0e0e0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {item.title}
      </p>
      <p style={{
        margin: '0 0 2px',
        fontSize: '10px',
        color: '#666',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {item.channel}
      </p>
      <p style={{
        margin: 0,
        fontSize: '10px',
        color: item.added_by_color,
        fontWeight: 600,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {item.added_by_name}
      </p>
    </div>
  );
}
