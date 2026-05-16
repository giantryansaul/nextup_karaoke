import { useState } from 'react';
import { PRESET_COLORS } from '../../types';

interface UserProfileFormProps {
  initialName?: string;
  initialColor?: string;
  submitLabel: string;
  onSubmit: (name: string, color: string) => Promise<void>;
}

export function UserProfileForm({ initialName = '', initialColor = PRESET_COLORS[5].hex, submitLabel, onSubmit }: UserProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSubmit(name.trim(), color);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Your Name
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="Enter your name..."
            style={{
              width: '100%',
              padding: '12px 50px 12px 16px',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              color: name ? color : '#fff',
              fontSize: '18px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            color: name.length >= 28 ? '#ff6b6b' : '#555',
          }}>
            {name.length}/30
          </span>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Display Color
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => setColor(c.hex)}
              title={c.name}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '8px',
                background: c.hex,
                border: color === c.hex ? '3px solid #fff' : '3px solid transparent',
                cursor: 'pointer',
                outline: color === c.hex ? `0 0 0 2px #fff` : 'none',
                boxShadow: color === c.hex ? `0 0 0 2px #fff` : 'none',
                transition: 'box-shadow 0.1s',
              }}
            />
          ))}
        </div>
        <p style={{ marginTop: '8px', fontSize: '13px', color: color, fontWeight: 600 }}>
          Preview: {name || 'Your Name'}
        </p>
      </div>

      {error && (
        <p style={{ color: '#ff6b6b', fontSize: '14px', margin: 0 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '14px',
          background: loading ? '#333' : '#fff',
          color: '#000',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {loading ? 'Please wait...' : submitLabel}
      </button>
    </form>
  );
}
