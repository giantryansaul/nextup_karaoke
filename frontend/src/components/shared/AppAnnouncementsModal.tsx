import { useState } from 'react';

interface AppAnnouncement {
  version: string;
  date: string;
  items: string[];
}

const APP_ANNOUNCEMENTS: AppAnnouncement[] = [
  {
    version: '0.2.0',
    date: 'June 20, 2026',
    items: [
      'Favorites — star any song from Search or Queue to save it. Find your saved songs in the new Favorites tab.',
    ],
  },
  {
    version: '0.1.2',
    date: 'June 20, 2026',
    items: [
      'YouTube "recommended videos" overlay is now suppressed — the display automatically advances to the next song a few seconds before the current one ends.',
      'Add a song for someone else — tap "Add for someone else" on the search page to queue a song under another party member\'s name.',
    ],
  },
  {
    version: '0.1.1',
    date: 'June 20, 2026',
    items: [
      'Added Restart button to remote controls — restart the current track from the beginning on both the display and mobile.',
    ],
  },
  {
    version: '0.1.0',
    date: 'May 16, 2026',
    items: [
      'NextUp Karaoke launched! Host a party, add YouTube karaoke videos to the queue, and let everyone control the show from their phone.',
    ],
  },
];

export function AppAnnouncementsModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: '#ccc',
          fontSize: '13px',
          fontWeight: 500,
          textDecoration: 'underline',
          textDecorationColor: '#333',
          textUnderlineOffset: '3px',
        }}
      >
        Latest Updates
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: '16px',
              padding: '28px 24px',
              width: '100%',
              maxWidth: '420px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Latest Updates</h2>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {APP_ANNOUNCEMENTS.map((announcement) => (
                <div key={announcement.version}>
                  <p style={{
                    margin: '0 0 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#facc15',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}>
                    v{announcement.version} · {announcement.date}
                  </p>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {announcement.items.map((item, i) => (
                      <li key={i} style={{ fontSize: '14px', color: '#ddd', lineHeight: 1.5 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
