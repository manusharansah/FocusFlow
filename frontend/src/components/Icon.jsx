import React from 'react';

const PATHS = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10',
  tasks: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  timer: 'M12 8v5l3 2M9 2h6M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  card: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7ZM3 10h18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6 6 18',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v7h-4z',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M8 5v14M16 5v14',
  reset: 'M4 12a8 8 0 1 0 3-6.2M4 4v5h5',
  calendar: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM4 10h16M8 3v4M16 3v4',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z',
  x: 'M6 6l12 12M18 6 6 18',
  sun: 'M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z',
};

export default function Icon({ name, size = 18, strokeWidth = 1.9, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Logo: an open focus ring with a flow wave inside. */
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 64 64" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
        <path d="M46.5 21.5A18 18 0 1 0 50 32" strokeWidth="5.5" />
        <path d="M22 33c4-7 8 7 12 0s6-4 8-2" strokeWidth="4.5" />
      </svg>
    </span>
  );
}

export function Wordmark() {
  // One element, so the flex gap on .brand does not split the two halves of the name.
  return <span className="wordmark">Focus<span className="gradient-text">Flow</span></span>;
}
