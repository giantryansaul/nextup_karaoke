import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { AppAnnouncementsModal } from '../shared/AppAnnouncementsModal';

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
      position: 'relative',
    }}>
      <div style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <AppAnnouncementsModal />
        <a
          href="https://github.com/giantryansaul/nextup_karaoke"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#ccc',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #444',
            background: '#1a1a1a',
          }}
        >
          <svg height="16" viewBox="0 0 16 16" width="16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub
        </a>
      </div>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🎤</p>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            NextUp Karaoke
          </h1>
          <p style={{ color: '#eee', margin: 0, fontSize: '16px' }}>
            YouTube karaoke queue for parties
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
