import React, { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../utils/api';
import Icon from './Icon';

const PRESETS = [15, 25, 45, 60];

export default function FocusTimer({ tasks = [] }) {
  const [minutes, setMinutes] = useState(25);
  const [endsAt, setEndsAt] = useState(null); // timestamp: robust to tab throttling
  const [paused, setPaused] = useState(false);
  const [left, setLeft] = useState(25 * 60);
  const [taskId, setTaskId] = useState('');
  const [message, setMessage] = useState(null);
  const [history, setHistory] = useState([]);
  const saving = useRef(false);
  const running = endsAt !== null;

  const loadHistory = useCallback(async () => {
    try { const { data } = await api.get('/tasks/focus-sessions/'); setHistory(data); } catch { /* non-critical */ }
  }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const finish = useCallback(async (completed, elapsedMin) => {
    if (saving.current) return;
    saving.current = true;
    try {
      if (elapsedMin >= 1) {
        await api.post('/tasks/focus-session/', {
          duration_minutes: Math.min(180, elapsedMin), completed, task: taskId ? Number(taskId) : null,
        });
        await loadHistory();
      }
      setMessage(completed ? { kind: 'success', text: `Session complete. ${elapsedMin} minutes logged.` } : null);
    } catch (e) {
      setMessage({ kind: 'error', text: errorMessage(e, 'Could not save the session.') });
    } finally { saving.current = false; }
  }, [taskId, loadHistory]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) { setEndsAt(null); setPaused(false); setLeft(minutes * 60); finish(true, minutes); }
    }, 250);
    return () => clearInterval(id);
  }, [running, endsAt, minutes, finish]);

  const start = () => { setMessage(null); setPaused(false); setEndsAt(Date.now() + left * 1000); };
  const pause = () => { setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))); setEndsAt(null); setPaused(true); };
  const reset = () => {
    const elapsed = Math.floor((minutes * 60 - (running ? Math.ceil((endsAt - Date.now()) / 1000) : left)) / 60);
    setEndsAt(null); setPaused(false); setLeft(minutes * 60);
    if (elapsed >= 1) finish(false, elapsed);
  };
  const choose = (m) => { if (!running) { setMinutes(m); setLeft(m * 60); setPaused(false); } };

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const progress = 1 - left / (minutes * 60);
  const C = 2 * Math.PI * 108;
  const todayMinutes = history.filter((s) => s.completed && new Date(s.started_at).toDateString() === new Date().toDateString())
    .reduce((n, s) => n + s.duration_minutes, 0);

  return (
    <div className="grid-2">
      <div className="card timer">
        <div className="presets" role="group" aria-label="Session length">
          {PRESETS.map((m) => (
            <button key={m} type="button" aria-pressed={minutes === m} disabled={running} onClick={() => choose(m)}>{m} min</button>
          ))}
        </div>
        <div className="ring">
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r="108" fill="none" stroke="var(--surface-2)" strokeWidth="10" />
            <circle cx="120" cy="120" r="108" fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          </svg>
          <div className="time" role="timer" aria-live="off">{mm}:{ss}</div>
        </div>
        <div className="field" style={{ width: '100%', maxWidth: 320 }}>
          <label htmlFor="focus-task">Working on (optional)</label>
          <select id="focus-task" className="select" value={taskId} disabled={running} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">No specific task</option>
            {tasks.filter((t) => !t.completed).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div className="timer-actions">
          {running
            ? <button className="btn btn-lg" onClick={pause}><Icon name="pause" />Pause</button>
            : <button className="btn btn-lg" onClick={start}><Icon name="play" />{paused ? 'Resume' : 'Start focus'}</button>}
          <button className="btn btn-secondary btn-lg" onClick={reset} disabled={!running && !paused}><Icon name="reset" />Stop</button>
        </div>
        {message && <div className={`alert alert-${message.kind}`} role="status">{message.text}</div>}
      </div>
      <div className="card card-pad">
        <h2 className="card-title">Recent sessions</h2>
        <p className="card-sub">{todayMinutes} minutes of focus today</p>
        {history.length === 0 ? <p className="empty">No sessions yet. Start your first one.</p> : (
          <ul style={{ marginTop: 12 }}>
            {history.slice(0, 8).map((s) => (
              <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <span>{s.duration_minutes} min {s.completed ? '' : '(stopped early)'}</span>
                <span className="card-sub">{new Date(s.started_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
