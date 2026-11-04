import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Icon, { BrandMark, Wordmark } from './Icon';
import ThemeToggle from './ThemeToggle';

const TITLES = {
  '/': 'FocusFlow', '/pricing': 'Pricing', '/login': 'Sign in', '/register': 'Create account',
  '/privacy': 'Privacy Policy', '/terms': 'Terms of Service', '/app': 'Overview', '/app/tasks': 'Tasks',
  '/app/focus': 'Focus timer', '/app/insights': 'Insights', '/app/account': 'Account',
};

/** On route change: update the document title and move focus to <main> so screen-reader and keyboard users land on new content. */
function useRouteAnnouncer(mainRef) {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    const name = TITLES[pathname];
    document.title = name && name !== 'FocusFlow' ? `${name} | FocusFlow` : 'FocusFlow';
    if (first.current) { first.current = false; return; }
    mainRef.current?.focus({ preventScroll: false });
  }, [pathname, mainRef]);
}

const SkipLink = () => <a href="#main" className="skip-link">Skip to content</a>;

export function PublicLayout() {
  const { user } = useAuth();
  const mainRef = useRef(null);
  useRouteAnnouncer(mainRef);
  return (
    <>
      <SkipLink />
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link to="/" className="brand"><BrandMark /><Wordmark /></Link>
          <nav className="nav-links" aria-label="Main">
            <Link to="/pricing" className="hide-sm">Pricing</Link>
            <ThemeToggle />
            {user ? (
              <Link to="/app" className="btn">Open app</Link>
            ) : (
              <>
                <Link to="/login" className="hide-xs">Sign in</Link>
                <Link to="/register" className="btn">Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} ref={mainRef} className="focus-target"><Outlet /></main>
      <footer className="footer">
        <div className="footer-inner">
          <span>&copy; {new Date().getFullYear()} FocusFlow</span>
          <nav aria-label="Legal">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

const NAV = [
  { to: '/app', label: 'Overview', icon: 'home', end: true },
  { to: '/app/tasks', label: 'Tasks', icon: 'tasks' },
  { to: '/app/focus', label: 'Focus timer', icon: 'timer' },
  { to: '/app/insights', label: 'Insights', icon: 'chart' },
  { to: '/app/account', label: 'Account', icon: 'user' },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const mainRef = useRef(null);
  const menuBtn = useRef(null);
  const searchRef = useRef(null);
  const [q, setQ] = useState('');
  const onSearch = (e) => { e.preventDefault(); navigate(`/app/tasks${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); };
  // Press / anywhere (outside inputs) to focus search.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && !e.metaKey && !e.ctrlKey) { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useRouteAnnouncer(mainRef);

  // Close the mobile drawer with Escape and give focus back to the menu button.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); menuBtn.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const signOut = async () => { await logout(); navigate('/login', { replace: true }); };

  return (
    <div className="shell">
      <SkipLink />
      <aside id="sidebar" className={`sidebar${open ? ' open' : ''}`} aria-label="Sidebar">
        <Link to="/app" className="brand"><BrandMark /><Wordmark /></Link>
        <div>
          <div className="side-label">Workspace</div>
          <nav className="side-nav" aria-label="Workspace" onClick={() => setOpen(false)}>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon name={n.icon} />{n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="side-bottom">
          {!user.is_premium && (
            <div className="plan-box">
              <strong>Free plan</strong>
              <span>Unlock unlimited tasks, the focus timer and advanced insights.</span>
              <Link to="/pricing" className="btn btn-block">Upgrade</Link>
            </div>
          )}
          <div className="userbox">
            <span className="avatar" aria-hidden="true">{user.username?.[0]?.toUpperCase() || '?'}</span>
            <div className="who"><strong>{user.username}</strong><span>{user.email}</span></div>
            <button className="icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out"><Icon name="logout" /></button>
          </div>
        </div>
      </aside>
      <div className={`scrim${open ? ' open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="main">
        <header className="topbar">
          <button ref={menuBtn} className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"
            aria-expanded={open} aria-controls="sidebar"><Icon name="menu" /></button>
          <form className="top-search" role="search" onSubmit={onSearch}>
            <Icon name="search" size={18} />
            <label className="sr-only" htmlFor="global-search">Search tasks</label>
            <input id="global-search" ref={searchRef} className="input" placeholder="Search tasks  ( / )" value={q}
              maxLength={100} onChange={(e) => setQ(e.target.value)} />
          </form>
          <ThemeToggle />
          <Link to="/app/account" className="avatar top-avatar" aria-label="Account" title={user.email}>{user.username?.[0]?.toUpperCase() || '?'}</Link>
        </header>
        <main id="main" tabIndex={-1} ref={mainRef} className="content focus-target">
          {!user.email_verified && <VerifyBanner email={user.email} />}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function VerifyBanner({ email }) {
  const [state, setState] = useState('idle');
  const resend = async () => {
    setState('sending');
    try { await api.post('/users/resend-verification/', { email }); setState('sent'); } catch { setState('error'); }
  };
  return (
    <div className="alert alert-info" style={{ marginBottom: 20 }} role="status">
      Please verify your email address. We sent you a link when you signed up.{' '}
      {state === 'sent' ? <strong>New link sent.</strong> : (
        <button type="button" className="link-btn" onClick={resend} disabled={state === 'sending'}>Resend email</button>
      )}
      {state === 'error' && ' Could not send. Try again later.'}
    </div>
  );
}
