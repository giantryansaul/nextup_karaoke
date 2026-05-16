import { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { UserProfileForm } from '../shared/UserProfileForm';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function UserPage() {
  const { user, setUser } = useUser();
  const [saved, setSaved] = useState(false);

  const handleUpdate = async (name: string, color: string) => {
    if (!user) return;
    const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    const updated = await res.json();
    setUser(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) return null;

  return (
    <div style={{ padding: '24px 16px 80px' }}>
      <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 700 }}>Profile</h2>

      {saved && (
        <div style={{
          padding: '12px 16px',
          background: '#0d2b0d',
          border: '1px solid #1a5a1a',
          borderRadius: '8px',
          color: '#4ade80',
          fontSize: '14px',
          marginBottom: '20px',
        }}>
          Profile saved!
        </div>
      )}

      <UserProfileForm
        initialName={user.name}
        initialColor={user.color}
        submitLabel="Save Changes"
        onSubmit={handleUpdate}
      />
    </div>
  );
}
