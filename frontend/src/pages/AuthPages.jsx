import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { errorMessage, refreshSession } from '../utils/api';
import Loading from '../components/Loading';

function GoogleButton() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get('/users/csrf/').then((r) => alive && setCfg(r.data)).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!cfg?.google) return null;
  // Sign-in is a CSRF-protected form POST navigation handled by django-allauth.
  return (
    <>
      <div className="divider">or</div>
      <form method="post" action="/accounts/google/login/">
        <input type="hidden" name="csrfmiddlewaretoken" value={cfg.csrfToken} />
        <input type="hidden" name="process" value="login" />
        <button type="submit" className="btn btn-secondary btn-block">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
            <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          Continue with Google
        </button>
      </form>
    </>
  );
}

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(params.get('error') ? 'Google sign-in failed. Please try again.' : '');
  const [busy, setBusy] = useState(false);
  // Only allow same-site relative redirects (prevents open redirects).
  const from = typeof location.state?.from === 'string' && /^\/(?!\/)/.test(location.state.from) ? location.state.from : '/app';

  useEffect(() => { if (user) navigate(from, { replace: true }); }, [user, from, navigate]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await login(email, password); } catch (err) { setError(errorMessage(err, 'Could not sign in.')); setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>Welcome back</h1><p className="sub">Sign in to your FocusFlow account.</p>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }} role="alert">{error}</div>}
        <form className="stack" onSubmit={submit}>
          <div className="field"><label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field"><label htmlFor="password">Password</label>
            <input id="password" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <div style={{ textAlign: 'right', marginTop: -8 }}><Link to="/forgot-password" className="hint">Forgot password?</Link></div>
          <button className="btn btn-block" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <GoogleButton />
        <p className="auth-foot">New to FocusFlow? <Link to="/register">Create an account</Link></p>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await register(form.username, form.email, form.password); setDone(true); }
    catch (err) { setError(errorMessage(err, 'Could not create the account.')); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="auth-wrap"><div className="card auth-card">
        <h1>Check your inbox</h1>
        <p className="sub">If this email can be used, we sent a verification link to <strong>{form.email}</strong>. You can sign in right away.</p>
        <Link to="/login" className="btn btn-block">Continue to sign in</Link>
      </div></div>
    );
  }
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>Create your account</h1><p className="sub">Free forever. Upgrade when you need more.</p>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }} role="alert">{error}</div>}
        <form className="stack" onSubmit={submit}>
          <div className="field"><label htmlFor="username">Username</label>
            <input id="username" className="input" autoComplete="username" maxLength={150} value={form.username} onChange={set('username')} required /></div>
          <div className="field"><label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" autoComplete="email" value={form.email} onChange={set('email')} required /></div>
          <div className="field"><label htmlFor="password">Password</label>
            <input id="password" type="password" className="input" autoComplete="new-password" minLength={10} maxLength={128} value={form.password} onChange={set('password')} required />
            <span className="hint">At least 10 characters. Avoid common passwords.</span></div>
          <label style={{ display: 'flex', gap: 10, fontSize: 13.5, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required style={{ marginTop: 3 }} />
            <span>I agree to the <Link to="/terms" target="_blank">Terms</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>.</span>
          </label>
          <button className="btn btn-block" disabled={busy || !accepted}>{busy ? 'Creating...' : 'Create account'}</button>
        </form>
        <GoogleButton />
        <p className="auth-foot">Already registered? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ busy: false, done: false, error: '' });
  const submit = async (e) => {
    e.preventDefault(); setState({ busy: true, done: false, error: '' });
    try { await api.post('/users/password-reset/', { email }); setState({ busy: false, done: true, error: '' }); }
    catch (err) { setState({ busy: false, done: false, error: errorMessage(err) }); }
  };
  return (
    <div className="auth-wrap"><div className="card auth-card">
      <h1>Reset your password</h1><p className="sub">Enter your email and we will send a reset link.</p>
      {state.done ? <div className="alert alert-success" role="status">If that email is registered, a reset link is on its way.</div> : (
        <form className="stack" onSubmit={submit}>
          {state.error && <div className="alert alert-error" role="alert">{state.error}</div>}
          <div className="field"><label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <button className="btn btn-block" disabled={state.busy}>Send reset link</button>
        </form>
      )}
      <p className="auth-foot"><Link to="/login">Back to sign in</Link></p>
    </div></div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ busy: false, done: false, error: '' });
  const submit = async (e) => {
    e.preventDefault(); setState({ busy: true, done: false, error: '' });
    try {
      await api.post('/users/password-reset/confirm/', { uid: params.get('uid'), token: params.get('token'), password });
      setState({ busy: false, done: true, error: '' });
    } catch (err) { setState({ busy: false, done: false, error: errorMessage(err) }); }
  };
  return (
    <div className="auth-wrap"><div className="card auth-card">
      <h1>Choose a new password</h1><p className="sub">Use at least 10 characters.</p>
      {state.done ? (
        <><div className="alert alert-success" role="status">Password updated.</div><p className="auth-foot"><Link to="/login" className="btn btn-block">Sign in</Link></p></>
      ) : (
        <form className="stack" onSubmit={submit}>
          {state.error && <div className="alert alert-error" role="alert">{state.error}</div>}
          <div className="field"><label htmlFor="pw">New password</label>
            <input id="pw" type="password" className="input" autoComplete="new-password" minLength={10} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <button className="btn btn-block" disabled={state.busy}>Update password</button>
        </form>
      )}
    </div></div>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const { user, reloadUser } = useAuth();
  const [state, setState] = useState('working');
  useEffect(() => {
    let alive = true;
    api.post('/users/verify-email/', { uid: params.get('uid'), token: params.get('token') })
      .then(() => { if (user) reloadUser(); if (alive) setState('ok'); })
      .catch(() => alive && setState('error'));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (state === 'working') return <Loading label="Verifying" />;
  return (
    <div className="auth-wrap"><div className="card auth-card">
      {state === 'ok'
        ? <><h1>Email verified</h1><p className="sub">Thanks. Your address is confirmed.</p><Link to="/app" className="btn btn-block">Continue</Link></>
        : <><h1>Link expired</h1><p className="sub">This verification link is invalid or has expired. Sign in and request a new one.</p><Link to="/login" className="btn btn-block">Sign in</Link></>}
    </div></div>
  );
}

/** Landing point after Google sign-in: the server set the refresh cookie, exchange it for an access token. */
export function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  useEffect(() => {
    refreshSession().then((d) => { setUser(d.user); navigate('/app', { replace: true }); })
      .catch(() => navigate('/login?error=oauth', { replace: true }));
  }, [navigate, setUser]);
  return <Loading label="Signing you in" />;
}
