import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { errorMessage } from '../utils/api';
import Icon from '../components/Icon';
import Loading from '../components/Loading';
import { formatMoney } from '../utils/format';

const FEATURES = [
  { icon: 'tasks', title: 'Tasks that stay organised', text: 'Prioritise, set due dates and switch between a list and a board.' },
  { icon: 'timer', title: 'Focused work sessions', text: 'Time-boxed sessions linked to the task you are working on.' },
  { icon: 'chart', title: 'See your progress', text: 'Weekly charts for completed work and focus time.' },
  { icon: 'shield', title: 'Your data stays yours', text: 'Export or delete everything from your account at any time.' },
];

const FEATURE_TONES = ['t1', 't2', 't3', 't4'];

export function Landing() {
  const cols = [['To do', ['Draft project brief', 'Book design review'], 'High'], ['In progress', ['Prepare launch notes'], 'Medium'], ['Done', ['Set up workspace', 'Invite the team'], 'Low']];
  const tone = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
  return (
    <>
      <section className="hero container">
        <span className="eyebrow"><Icon name="sparkles" size={16} />Tasks, focus and insights in one place</span>
        <h1>Plan your work. <span className="gradient-text">Focus deeply.</span> Finish more.</h1>
        <p className="lead">FocusFlow brings tasks, a focus timer and simple analytics into one calm, fast workspace.</p>
        <div className="hero-cta">
          <Link to="/register" className="btn btn-lg">Start for free</Link>
          <Link to="/pricing" className="btn btn-secondary btn-lg">View pricing</Link>
        </div>
        <div className="window preview" aria-hidden="true">
          <div className="window-bar"><i /><i /><i /><span>focusflow / board</span></div>
          <div className="window-body">
            <div className="window-side"><b /><b /><b /><b /></div>
            <div className="window-main">
              <div className="cols">
                {cols.map(([name, items, pr]) => (
                  <div className="col" key={name}><h4><span className={`dot ${name === 'To do' ? 'todo' : name === 'Done' ? 'done' : 'in_progress'}`} />{name}</h4>
                    {items.map((i) => <div className="mini" key={i}>{i}<span><span className={`badge ${tone[pr]}`}>{pr}</span></span></div>)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section container">
        <h2>Everything you need, <span className="gradient-text">nothing you do not</span></h2>
        <p className="sub">Start free with up to 10 tasks. Upgrade for unlimited tasks and the focus timer.</p>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div className="card feature" key={f.title}><div className={`ico ${FEATURE_TONES[i]}`}><Icon name={f.icon} size={22} /></div><h3>{f.title}</h3><p>{f.text}</p></div>
          ))}
        </div>
      </section>
    </>
  );
}

const Item = ({ children, off }) => (
  <li className={off ? 'off' : ''}><Icon name={off ? 'x' : 'check'} size={16} strokeWidth={2.4} /><span>{children}</span></li>
);

export function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [cycle, setCycle] = useState('monthly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/payments/plans/').then((r) => setCatalog(r.data.plans)).catch(() => setCatalog([]));
  }, []);

  const plan = catalog?.find((p) => p.plan === cycle) || catalog?.[0];
  const yearly = catalog?.find((p) => p.plan === 'yearly');
  const monthly = catalog?.find((p) => p.plan === 'monthly');
  const saving = yearly && monthly ? Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100) : 0;

  const upgrade = async () => {
    if (!user) { navigate('/register'); return; }
    setBusy(true); setError('');
    try { const { data } = await api.post('/payments/create-checkout/', { plan: plan.plan }); window.location.assign(data.checkout_url); }
    catch (e) { setError(errorMessage(e)); setBusy(false); }
  };

  return (
    <section className="section container">
      <h2>Simple, transparent pricing</h2>
      <p className="sub">Start free. Upgrade when you are ready. Cancel anytime.</p>
      {catalog && catalog.length > 1 && (
        <div className="cycle"><div className="tabs" role="group" aria-label="Billing period">
          <button type="button" aria-pressed={cycle === 'monthly'} onClick={() => setCycle('monthly')}>Monthly</button>
          <button type="button" aria-pressed={cycle === 'yearly'} onClick={() => setCycle('yearly')}>Yearly{saving > 0 ? ` (save ${saving}%)` : ''}</button>
        </div></div>
      )}
      {error && <div className="alert alert-error" style={{ maxWidth: 480, margin: '20px auto 0' }} role="alert">{error}</div>}
      <div className="price-grid">
        <div className="card plan">
          <div><h3>Free</h3><p className="card-sub">For getting organised</p></div>
          <div className="amount">$0<small> / forever</small></div>
          <ul><Item>Up to 10 tasks</Item><Item>List and board views</Item><Item>Basic insights</Item><Item off>Focus timer</Item><Item off>Advanced insights</Item></ul>
          {user ? <button className="btn btn-secondary" disabled>{user.is_premium ? 'Included' : 'Current plan'}</button> : <Link to="/register" className="btn btn-secondary">Get started</Link>}
        </div>
        <div className="card plan featured">
          <span className="badge badge-accent tag"><Icon name="sparkles" size={14} />Most popular</span>
          <div><h3>Premium</h3><p className="card-sub">For people who ship</p></div>
          {catalog === null ? <Loading /> : plan
            ? <div className="amount">{formatMoney(plan.amount, plan.currency)}<small> / {plan.interval}</small></div>
            : <div className="card-sub">Pricing is not available right now.</div>}
          <ul><Item>Unlimited tasks</Item><Item>List and board views</Item><Item>Focus timer with session history</Item><Item>Advanced insights</Item><Item>Priority email support</Item></ul>
          {user?.is_premium
            ? <button className="btn" disabled>Current plan</button>
            : <button className="btn" onClick={upgrade} disabled={busy || (user && !plan)}>{busy ? 'Redirecting...' : user ? 'Upgrade to Premium' : 'Sign up to upgrade'}</button>}
        </div>
      </div>
      <p className="hint" style={{ textAlign: 'center', marginTop: 24 }}>Payments are processed securely by Stripe. We never see or store your card details.</p>
    </section>
  );
}

export function PaymentSuccess() {
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  const [state, setState] = useState(() => (params.get('session_id') ? 'working' : 'error'));

  useEffect(() => {
    const id = params.get('session_id');
    if (!id) return undefined;
    let alive = true;
    let tries = 0;
    const attempt = async () => {
      try {
        const { data } = await api.post('/payments/verify-payment/', { session_id: id });
        if (!alive) return;
        if (data.success) { setUser(data.user); setState('ok'); return; }
      } catch (e) { if (alive && e.response?.status !== 503) { setState('error'); return; } }
      if (++tries < 6 && alive) setTimeout(attempt, 2000); else if (alive) setState('pending');
    };
    attempt();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'working') return <Loading label="Confirming your payment" />;
  return (
    <div className="auth-wrap"><div className="card auth-card" style={{ textAlign: 'center' }}>
      {state === 'ok' && <><h1>You are on Premium</h1><p className="sub">Thank you. All Premium features are now unlocked.</p><Link to="/app" className="btn btn-block">Go to your workspace</Link></>}
      {state === 'pending' && <><h1>Payment received</h1><p className="sub">We are still confirming it with Stripe. Premium will unlock automatically in a minute.</p><Link to="/app" className="btn btn-block">Back to workspace</Link></>}
      {state === 'error' && <><h1>We could not confirm this payment</h1><p className="sub">If you were charged, your plan will activate shortly. Otherwise try again.</p><Link to="/pricing" className="btn btn-block">Back to pricing</Link></>}
    </div></div>
  );
}

const Legal = ({ title, updated, children }) => (
  <article className="legal"><h1>{title}</h1><p className="hint">Last updated {updated}</p>{children}</article>
);

export const Privacy = () => (
  <Legal title="Privacy Policy" updated="1 November 2026">
    <p>This policy explains what FocusFlow collects and why. Replace the operator details below with your registered company information before launch.</p>
    <h2>What we collect</h2>
    <ul><li>Account data: username, email address and a salted password hash (or your Google account identifier).</li>
      <li>Content you create: tasks, focus sessions and settings.</li>
      <li>Billing data: handled by Stripe. We keep only a customer ID, subscription status and invoice amounts, never card numbers.</li></ul>
    <h2>How we use it</h2><p>To run the service, secure accounts, process payments and send essential emails such as verification and password reset. We do not sell personal data.</p>
    <h2>Your rights</h2><p>You can export or permanently delete your data at any time from Account settings. For other requests, contact us using the address below.</p>
    <h2>Cookies</h2><p>We use only strictly necessary cookies (an HttpOnly session cookie that keeps you signed in). We do not use advertising or tracking cookies.</p>
    <h2>Contact</h2><p>privacy@your-domain.example</p>
  </Legal>
);

export const Terms = () => (
  <Legal title="Terms of Service" updated="1 November 2026">
    <p>By using FocusFlow you agree to these terms. Replace the placeholders below with your legal entity details and governing law before launch.</p>
    <h2>The service</h2><p>FocusFlow provides task management, a focus timer and analytics. Free accounts are limited to 10 tasks; Premium removes that limit and adds the focus timer and advanced insights.</p>
    <h2>Subscriptions</h2><p>Premium renews automatically each billing period until cancelled. You can cancel at any time from Account, and access continues until the end of the paid period.</p>
    <h2>Acceptable use</h2><p>Do not misuse the service, attempt to access other users' data, or interfere with its operation.</p>
    <h2>Liability</h2><p>The service is provided as is, to the extent permitted by law.</p>
    <h2>Contact</h2><p>support@your-domain.example</p>
  </Legal>
);

export const NotFound = () => (
  <div className="center-screen"><div><h1>Page not found</h1><p className="card-sub" style={{ margin: '8px 0 20px' }}>The page you are looking for does not exist.</p><Link to="/" className="btn">Go home</Link></div></div>
);
