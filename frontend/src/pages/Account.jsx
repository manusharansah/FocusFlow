import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { errorMessage } from '../utils/api';

export default function Account() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user.username);
  const [msg, setMsg] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (confirming && !d.open) d.showModal(); // native focus trap, Escape and inert background
    if (!confirming && d.open) d.close();
  }, [confirming]);

  const saveProfile = async (e) => {
    e.preventDefault(); setMsg(null);
    try { const { data } = await api.patch('/users/profile/', { username }); setUser(data); setMsg({ kind: 'success', text: 'Profile updated.' }); }
    catch (err) { setMsg({ kind: 'error', text: errorMessage(err) }); }
  };

  const openPortal = async () => {
    setBusy(true); setMsg(null);
    try { const { data } = await api.post('/payments/portal/'); window.location.assign(data.url); }
    catch (err) { setMsg({ kind: 'error', text: errorMessage(err) }); setBusy(false); }
  };

  const exportData = async () => {
    try {
      const { data } = await api.get('/users/export/');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'focusflow-data.json'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { setMsg({ kind: 'error', text: errorMessage(err) }); }
  };

  const deleteAccount = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.delete('/users/profile/', { data: { password } }); await logout(); navigate('/', { replace: true }); }
    catch (err) { setMsg({ kind: 'error', text: errorMessage(err) }); setBusy(false); }
  };

  const renews = user.premium_until && new Date(user.premium_until).toLocaleDateString(undefined, { dateStyle: 'long' });

  return (
    <>
      <div className="page-head"><div><h1>Account</h1><p>Manage your profile, subscription and data.</p></div></div>
      {msg && <div className={`alert alert-${msg.kind}`} style={{ marginBottom: 16 }} role={msg.kind === 'error' ? 'alert' : 'status'}>{msg.text}</div>}
      <div style={{ maxWidth: 720 }}>
        <section className="card card-pad section-card">
          <h2 className="card-title" style={{ marginBottom: 14 }}>Profile</h2>
          <form className="stack" onSubmit={saveProfile}>
            <div className="field"><label htmlFor="acc-email">Email</label>
              <input id="acc-email" className="input" value={user.email} disabled />
              <span className="hint">{user.email_verified ? 'Verified' : 'Not verified yet'}</span></div>
            <div className="field"><label htmlFor="acc-name">Username</label>
              <input id="acc-name" className="input" value={username} maxLength={150} onChange={(e) => setUsername(e.target.value)} required /></div>
            <div><button className="btn" disabled={username === user.username}>Save changes</button></div>
          </form>
        </section>

        <section className="card card-pad section-card">
          <h2 className="card-title" style={{ marginBottom: 14 }}>Subscription</h2>
          <dl className="kv">
            <dt>Plan</dt><dd>{user.is_premium ? 'Premium' : 'Free'}</dd>
            {user.is_premium && renews && (<><dt>{user.cancel_at_period_end ? 'Ends on' : 'Renews on'}</dt><dd>{renews}</dd></>)}
          </dl>
          <div className="row-actions" style={{ marginTop: 16 }}>
            {user.is_premium || user.subscription_status
              ? <button className="btn btn-secondary" onClick={openPortal} disabled={busy}>Manage billing</button>
              : <Link to="/pricing" className="btn">Upgrade to Premium</Link>}
          </div>
        </section>

        <section className="card card-pad section-card">
          <h2 className="card-title" style={{ marginBottom: 6 }}>Your data</h2>
          <p className="card-sub" style={{ marginBottom: 14 }}>Download everything we store about you, or permanently delete your account.</p>
          <div className="row-actions">
            <button className="btn btn-secondary" onClick={exportData}>Export my data</button>
            <button className="btn btn-danger" onClick={() => setConfirming(true)}>Delete account</button>
          </div>
        </section>
      </div>

      <dialog ref={dialogRef} className="dialog-native" aria-labelledby="del-title" onClose={() => setConfirming(false)}>
        <form className="dialog stack" onSubmit={deleteAccount}>
          <h2 id="del-title" className="card-title">Delete your account?</h2>
          <p className="card-sub">This permanently erases your tasks, sessions and profile, and cancels any subscription. This cannot be undone.</p>
          <div className="field"><label htmlFor="del-pw">Confirm with your password</label>
            <input id="del-pw" type="password" className="input" value={password} autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
            <span className="hint">Signed up with Google? Leave this blank.</span></div>
          <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>Cancel</button>
            <button className="btn btn-danger" disabled={busy}>Delete forever</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
