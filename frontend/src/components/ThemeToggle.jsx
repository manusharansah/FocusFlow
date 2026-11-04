import React, { useState } from 'react';
import Icon from './Icon';
import { isDark, setTheme } from '../utils/theme';

export default function ThemeToggle() {
  const [dark, setDark] = useState(isDark);
  const toggle = () => { const next = dark ? 'light' : 'dark'; setTheme(next); setDark(!dark); };
  return (
    <button type="button" className="theme-btn" onClick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme">
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}
