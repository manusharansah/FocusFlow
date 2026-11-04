// Dark is the default. A visitor can switch to light; the choice is stored only on this device.
const KEY = 'ff-theme';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export function getTheme() { return read() === 'light' ? 'light' : 'dark'; }

export function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0b1120' : '#f6f5fd');
}

export function setTheme(t) {
  try { localStorage.setItem(KEY, t); } catch { /* storage unavailable: the choice lasts until reload */ }
  applyTheme(t);
}

export const isDark = () => getTheme() === 'dark';

export const initTheme = () => applyTheme(getTheme());
