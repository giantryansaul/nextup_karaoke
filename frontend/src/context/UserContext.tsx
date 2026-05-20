import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

const USER_KEY = 'nextup_user';
const PARTY_KEY = 'nextup_party';

interface UserContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  partyCode: string | null;
  setPartyCode: (code: string | null) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  const [partyCode, setPartyCodeState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(PARTY_KEY);
    } catch {
      return null;
    }
  });

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(PARTY_KEY);
      setPartyCodeState(null);
    }
  };

  const setPartyCode = (code: string | null) => {
    setPartyCodeState(code);
    if (code) {
      localStorage.setItem(PARTY_KEY, code);
    } else {
      localStorage.removeItem(PARTY_KEY);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, partyCode, setPartyCode }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
