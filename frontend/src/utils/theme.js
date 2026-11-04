// Theme = 'light' | 'dark' | null (follow the OS). Stored only as a per-device convenience.
const KEY = 'ff-theme';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export function getTheme() { const t = read(); return t === 'light' || t === 'dark' ? t : null; }

export function applyTheme(t) {
  const el = document.documentElement;
  if (t) el.setAttribute('data-theme', t); else el.removeAttribute('data-theme');
}

export function setTheme(t) {
  try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  applyTheme(t);
}

export function isDark() {
  const t = getTheme();
  return t ? t === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export const initTheme = () => applyTheme(getTheme());
