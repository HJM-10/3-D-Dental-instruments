import { useContext, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import { ACCENTS, AppearanceContext } from './AppearanceContext';

function UserAppearance({ user, children }) {
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);
  const storageKey = `dnf-appearance-${user?.id || 'guest'}`;
  const [appearance, setAppearance] = useState(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { /* Use defaults. */ }
    return {
      mode: isAdmin ? (saved.mode === 'dark' ? 'dark' : 'light') : (localStorage.getItem('theme') || 'dark'),
      accent: ACCENTS.some((item) => item.id === saved.accent) ? saved.accent : 'green',
    };
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = appearance.mode;
    if (isAdmin) {
      root.dataset.admin = 'true';
      root.dataset.accent = appearance.accent;
      root.style.setProperty('--admin-hue', ACCENTS.find((item) => item.id === appearance.accent).hue);
      localStorage.setItem(storageKey, JSON.stringify(appearance));
    } else {
      delete root.dataset.admin;
      delete root.dataset.accent;
      root.style.removeProperty('--admin-hue');
      localStorage.setItem('theme', appearance.mode);
    }
    return () => {
      delete root.dataset.admin;
      delete root.dataset.accent;
      root.style.removeProperty('--admin-hue');
    };
  }, [appearance, isAdmin, storageKey]);

  return <AppearanceContext.Provider value={{ ...appearance, isAdmin,
    setMode: (mode) => setAppearance((value) => ({ ...value, mode })),
    setAccent: (accent) => setAppearance((value) => ({ ...value, accent })),
  }}>{children}</AppearanceContext.Provider>;
}

export default function AppearanceProvider({ children }) {
  const { user } = useContext(AuthContext);
  return <UserAppearance key={`${user?.id || 'guest'}-${user?.role || ''}`} user={user}>{children}</UserAppearance>;
}
