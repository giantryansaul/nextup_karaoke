import { useState } from 'react';
import { useQueue } from '../../context/QueueContext';
import type { MoveDirection, QueueItem } from '../../types';

export function QueuePage() {
  const { state, removeFromQueue, moveQueueItem, setPaused, advanceQueue, clearQueue, endParty } = useQueue();
  const [showClearModal, setShowClearModal] = useState(false);
  const [showEndPartyModal, setShowEndPartyModal] = useState(false);

  if (!state) {
    return <p style={{ textAlign: 'center', color: '#555', padding: '48px 16px' }}>Loading...</p>;
  }

  const { queue, now_playing, is_paused } = state;
  const hasNowPlaying = now_playing !== null;

  const handleClearConfirm = async () => {
    await clearQueue();
    setShowClearModal(false);
  };

  const handleEndPartyConfirm = async () => {
    await endParty();
    setShowEndPartyModal(false);
    // Navigation happens via party_ended WebSocket event
  };

  return (
    <div style={{ paddingBottom: '80px' }}>

      {/* Remote Control */}
      <div style={{
        margin: '12px',
        padding: '14px 16px',
        background: '#0f0f0f',
        border: '1px solid #2a2a2a',
        borderRadius: '12px',
      }}>
        <p style={{ margin: '0 0 12px', fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Remote Control
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setPaused(!is_paused)}
            disabled={!hasNowPlaying}
            style={{
              flex: 1,
              padding: '12px',
              background: !hasNowPlaying ? '#111' : is_paused ? '#1a2a1a' : '#1a1a2a',
              color: !hasNowPlaying ? '#333' : is_paused ? '#4ade80' : '#88aaff',
              border: `1px solid ${!hasNowPlaying ? '#222' : is_paused ? '#2a5a2a' : '#2a2a5a'}`,
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: !hasNowPlaying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {is_paused ? '▶ Continue' : '⏸ Pause'}
          </button>
          <button
            onClick={() => advanceQueue()}
            disabled={!hasNowPlaying}
            style={{
              flex: 1,
              padding: '12px',
              background: !hasNowPlaying ? '#111' : '#1a1a1a',
              color: !hasNowPlaying ? '#333' : '#ccc',
              border: `1px solid ${!hasNowPlaying ? '#222' : '#333'}`,
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: !hasNowPlaying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            ⏭ Skip
          </button>
        </div>
      </div>

      {/* Queue header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Queue</h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#666' }}>
            {queue.length} song{queue.length !== 1 ? 's' : ''}
          </p>
        </div>
        {queue.length > 0 && (
          <button
            onClick={() => setShowClearModal(true)}
            style={{
              padding: '7px 12px',
              background: '#1a0a0a',
              color: '#ff6b6b',
              border: '1px solid #3a1a1a',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🗑 Clear All
          </button>
        )}
      </div>

      {/* Queue list */}
      {queue.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#555', padding: '48px 16px' }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🎤</p>
          <p style={{ fontSize: '16px' }}>The queue is empty. Search for a song to get started!</p>
        </div>
      ) : (
        queue.map((item, idx) => (
          <QueueRow
            key={item.id}
            item={item}
            isPlaying={item.id === now_playing}
            isFirst={idx === 0}
            isLast={idx === queue.length - 1}
            onMove={(dir) => moveQueueItem(item.id, dir)}
            onDelete={() => removeFromQueue(item.id)}
          />
        ))
      )}

      {/* End Party button */}
      <div style={{ padding: '16px', borderTop: '1px solid #1a1a1a', marginTop: '8px' }}>
        <button
          onClick={() => setShowEndPartyModal(true)}
          style={{
            width: '100%',
            padding: '13px',
            background: '#1a0505',
            color: '#ff6b6b',
            border: '1px solid #4a1010',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ✕ End Party
        </button>
      </div>

      {/* Clear All confirmation modal */}
      {showClearModal && (
        <div
          onClick={() => setShowClearModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111',
              border: '1px solid #333',
              borderRadius: '16px',
              padding: '28px 24px',
              width: '100%',
              maxWidth: '340px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '28px', margin: '0 0 16px' }}>⚠️</p>
            <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, lineHeight: 1.3 }}>
              ARE YOU SURE YOU WANT TO CLEAR THE LIST?
            </p>
            <p style={{ margin: '0 0 28px', fontSize: '13px', color: '#666' }}>
              This will remove all songs from the queue and cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowClearModal(false)}
                style={{
                  flex: 1, padding: '12px',
                  background: '#1a1a1a', color: '#fff',
                  border: '1px solid #333', borderRadius: '8px',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearConfirm}
                style={{
                  flex: 1, padding: '12px',
                  background: '#3a0a0a', color: '#ff6b6b',
                  border: '1px solid #6a1a1a', borderRadius: '8px',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Yes, Clear It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Party confirmation modal */}
      {showEndPartyModal && (
        <div
          onClick={() => setShowEndPartyModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111',
              border: '1px solid #333',
              borderRadius: '16px',
              padding: '28px 24px',
              width: '100%',
              maxWidth: '340px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '28px', margin: '0 0 16px' }}>🚫</p>
            <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, lineHeight: 1.3 }}>
              END THE PARTY?
            </p>
            <p style={{ margin: '0 0 28px', fontSize: '13px', color: '#666' }}>
              This will disconnect all users and remove all songs. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowEndPartyModal(false)}
                style={{
                  flex: 1, padding: '12px',
                  background: '#1a1a1a', color: '#fff',
                  border: '1px solid #333', borderRadius: '8px',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEndPartyConfirm}
                style={{
                  flex: 1, padding: '12px',
                  background: '#3a0a0a', color: '#ff6b6b',
                  border: '1px solid #6a1a1a', borderRadius: '8px',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                End Party
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface QueueRowProps {
  item: QueueItem;
  isPlaying: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: MoveDirection) => void;
  onDelete: () => void;
}

function QueueRow({ item, isPlaying, isFirst, isLast, onMove, onDelete }: QueueRowProps) {
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
        <ActionButton label="✕ Remove" onClick={onDelete} danger />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 10px',
        fontSize: '12px',
        fontWeight: 600,
        background: disabled ? '#111' : danger ? '#2a0a0a' : '#1a1a1a',
        color: disabled ? '#333' : danger ? '#ff6b6b' : '#ccc',
        border: `1px solid ${disabled ? '#222' : danger ? '#5a1a1a' : '#333'}`,
        borderRadius: '5px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}
