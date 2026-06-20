import { useState } from 'react';
import type { User } from '../../types';

interface GuestPickerModalProps {
  partyUsers: User[];
  onPick: (user: User) => void;
  onAddNew: (name: string) => Promise<void>;
  onClose: () => void;
}

export function GuestPickerModal({ partyUsers, onPick, onAddNew, onClose }: GuestPickerModalProps) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddNew = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await onAddNew(trimmed);
      setNewName('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 200,
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
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ width: '36px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 24px' }} />
        <p style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px' }}>Who are you picking for?</p>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {partyUsers.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              {partyUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onPick(u)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 4px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #1a1a1a',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    width: '10px', height: '10px',
                    borderRadius: '50%',
                    background: u.color,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>{u.name}</span>
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: partyUsers.length > 0 ? '20px' : '0' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
              Add someone new
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAddNew(); }}
                placeholder="Their name"
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => void handleAddNew()}
                disabled={!newName.trim() || adding}
                style={{
                  padding: '11px 18px',
                  background: !newName.trim() || adding ? '#1a1a1a' : '#fff',
                  color: !newName.trim() || adding ? '#444' : '#000',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: !newName.trim() || adding ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {adding ? '...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
