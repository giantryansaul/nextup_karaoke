import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function LandingPage() {
  const { user, partyCode } = useUser();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [hosting, setHosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && partyCode) navigate('/search', { replace: true });
  }, [user, partyCode, navigate]);

  const handleHostParty = async () => {
    setHosting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/parties`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create party');
      const { party_code } = await res.json() as { party_code: string };
      navigate(`/display/${party_code}`);
    } catch {
      setError('Failed to create party. Please try again.');
      setHosting(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4));
    setError('');
  };

  const handleJoinContinue = () => {
    if (code.length !== 4) return;
    navigate(`/join/${code}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🎤</p>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            NextUp Karaoke
          </h1>
          <p style={{ color: '#666', margin: 0, fontSize: '16px' }}>
            Everyone's a star tonight
          </p>
        </div>

        {!joining ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              onClick={handleHostParty}
              disabled={hosting}
              style={{
                width: '100%',
                padding: '18px',
                background: hosting ? '#222' : '#fff',
                color: hosting ? '#555' : '#000',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 800,
                cursor: hosting ? 'not-allowed' : 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              {hosting ? 'Creating party…' : '🎉 Host a Party'}
            </button>

            <button
              onClick={() => { setJoining(true); setError(''); }}
              style={{
                width: '100%',
                padding: '18px',
                background: 'transparent',
                color: '#fff',
                border: '2px solid #333',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              🎵 Join a Party
            </button>

            {error && (
              <p style={{ margin: 0, textAlign: 'center', color: '#ff6b6b', fontSize: '14px' }}>
                {error}
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#888', textAlign: 'center' }}>
              Enter the 4-letter party code
            </p>
            <input
              autoFocus
              value={code}
              onChange={handleCodeChange}
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoinContinue(); }}
              placeholder="ABCD"
              maxLength={4}
              style={{
                width: '100%',
                padding: '20px',
                background: '#111',
                color: '#fff',
                border: '2px solid #333',
                borderRadius: '12px',
                fontSize: '32px',
                fontWeight: 800,
                textAlign: 'center',
                letterSpacing: '0.25em',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {error && (
              <p style={{ margin: 0, textAlign: 'center', color: '#ff6b6b', fontSize: '14px' }}>
                {error}
              </p>
            )}

            <button
              onClick={handleJoinContinue}
              disabled={code.length !== 4}
              style={{
                width: '100%',
                padding: '18px',
                background: code.length === 4 ? '#fff' : '#222',
                color: code.length === 4 ? '#000' : '#555',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 800,
                cursor: code.length === 4 ? 'pointer' : 'not-allowed',
              }}
            >
              Continue →
            </button>

            <button
              onClick={() => { setJoining(false); setCode(''); setError(''); }}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                color: '#555',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
