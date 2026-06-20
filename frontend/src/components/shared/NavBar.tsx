import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/search',    label: 'Search',    icon: '🔍' },
  { to: '/favorites', label: 'Favorites', icon: '⭐' },
  { to: '/queue',     label: 'Queue',     icon: '🎵' },
  { to: '/user',      label: 'Profile',   icon: '👤' },
];

export function NavBar() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#111',
      borderTop: '1px solid #222',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 0',
            textDecoration: 'none',
            color: isActive ? '#fff' : '#555',
            fontSize: '11px',
            fontWeight: isActive ? 700 : 400,
            gap: '2px',
            borderTop: isActive ? '2px solid #fff' : '2px solid transparent',
            transition: 'color 0.15s',
          })}
        >
          <span style={{ fontSize: '20px' }}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
