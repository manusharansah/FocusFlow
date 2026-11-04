import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Icon, { BrandMark } from './Icon';

export function PublicLayout() {
  const { user } = useAuth();
  return (
    <>
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link to="/" className="brand"><BrandMark />FocusFlow</Link>
          <nav className="nav-links" aria-label="Main">
            <Link to="/pricing" className="hide-sm">Pricing</Link>
            {user ? (
              <Link to="/app" className="btn">Open app</Link>
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link to="/register" className="btn">Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="footer">
        <div className="footer-inner">
          <span>&copy; {new Date().getFullYear()} FocusFlow</span>
          <nav aria-label="Legal">
            <Link to="/pricing">Pricing</Link>
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

  const signOut = async () => { await logout(); navigate('/login', { replace: true }); };

  return (
    <div className="shell">
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Sidebar">
        <Link to="/app" className="brand"><BrandMark />FocusFlow</Link>
        <div>
          <div className="side-label">Workspace</div>
          <nav className="side-nav" onClick={() => setOpen(false)}>
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
      <div className={`scrim${open ? ' open' : ''}`} onClick={() => setOpen(false)} />
      <div className="main">
        <div className="topbar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <Link to="/app" className="brand"><BrandMark />FocusFlow</Link>
          <span style={{ width: 34 }} />
        </div>
        <div className="content">
          {!user.email_verified && <VerifyBanner />}
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function VerifyBanner() {
  const [state, setState] = useState('idle');
  const resend = async () => {
    setState('sending');
    try { await api.post('/users/resend-verification/'); setState('sent'); } catch { setState('error'); }
  };
  return (
    <div className="alert alert-info" style={{ marginBottom: 20 }} role="status">
      Please verify your email address. We sent you a link when you signed up.{' '}
      {state === 'sent' ? <strong>New link sent.</strong> : (
        <button className="btn btn-ghost" style={{ height: 'auto', padding: 0, color: 'inherit', textDecoration: 'underline' }}
          onClick={resend} disabled={state === 'sending'}>Resend email</button>
      )}
      {state === 'error' && ' Could not send. Try again later.'}
    </div>
  );
}
