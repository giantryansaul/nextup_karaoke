import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { UserProfileForm } from '../shared/UserProfileForm';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function JoinPage() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/search', { replace: true });
  }, [user, navigate]);

  const handleJoin = async (name: string, color: string) => {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) throw new Error('Failed to join');
    const newUser = await res.json();
    setUser(newUser);
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
          <p style={{ color: '#666', margin: 0, fontSize: '16px' }}>
            Enter your name to join the party
          </p>
        </div>
        <UserProfileForm submitLabel="Join Party" onSubmit={handleJoin} />
      </div>
    </div>
  );
}
