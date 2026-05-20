import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { UserProfileForm } from '../shared/UserProfileForm';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function JoinPage() {
  const { partyCode: codeParam } = useParams<{ partyCode: string }>();
  const code = (codeParam ?? '').toUpperCase();
  const { user, setUser, partyCode, setPartyCode } = useUser();
  const navigate = useNavigate();
  const [partyError, setPartyError] = useState('');

  // Only auto-redirect if they're already in THIS specific party
  useEffect(() => {
    if (user && partyCode === code) navigate('/search', { replace: true });
  }, [user, partyCode, code, navigate]);

  const handleJoin = async (name: string, color: string) => {
    setPartyError('');
    const res = await fetch(`${API_BASE}/api/parties/${code}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) {
      if (res.status === 404) {
        setPartyError('Party not found or has already ended.');
        throw new Error('Party not found');
      }
      throw new Error('Failed to join');
    }
    const newUser = await res.json();
    setUser(newUser);
    setPartyCode(code);
    navigate('/search', { replace: true });
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
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            NextUp Karaoke
          </h1>
          <div style={{
            display: 'inline-block',
            padding: '4px 14px',
            background: '#111',
            border: '1px solid #333',
            borderRadius: '8px',
            marginBottom: '8px',
          }}>
            <span style={{ fontSize: '13px', color: '#888' }}>Party code: </span>
            <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.15em', color: '#fff' }}>
              {code}
            </span>
          </div>
          <p style={{ color: '#666', margin: 0, fontSize: '16px' }}>
            Enter your name to join
          </p>
        </div>

        {partyError && (
          <div style={{
            padding: '12px 16px',
            background: '#1a0a0a',
            border: '1px solid #5a1a1a',
            borderRadius: '8px',
            color: '#ff6b6b',
            fontSize: '14px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            {partyError}
          </div>
        )}

        <UserProfileForm submitLabel="Join Party" onSubmit={handleJoin} />
      </div>
    </div>
  );
}
