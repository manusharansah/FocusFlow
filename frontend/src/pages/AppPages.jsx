import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { errorMessage } from '../utils/api';
import { formatDue, isOverdue, parseDate } from '../utils/format';
import Analytics from '../components/Analytics';
import FocusTimer from '../components/FocusTimer';
import Icon from '../components/Icon';
import Loading from '../components/Loading';
import { TaskBoard, TaskList } from '../components/TaskViews';
import useTasks from '../components/useTasks';

const FREE_LIMIT = 10;

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tip"><strong>{label}</strong><div>{payload[0].name}: {payload[0].value}</div></div>;
}

function QuickAdd({ onCreate }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true); setError('');
    try {
      await onCreate({ title: title.trim(), priority, due_date: due || null });
      setTitle(''); setDue('');
    } catch (err) { setError(errorMessage(err, 'Could not add the task.')); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="card" style={{ marginBottom: 20 }}>
      <div className="quick-add">
        <label className="sr-only" htmlFor="new-title">Task title</label>
        <input id="new-title" className="input" placeholder="Add a task..." value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} required />
        <label className="sr-only" htmlFor="new-priority">Priority</label>
        <select id="new-priority" className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option>
        </select>
        <label className="sr-only" htmlFor="new-due">Due date</label>
        <input id="new-due" type="date" className="input" style={{ width: 'auto' }} value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="btn" disabled={busy}><Icon name="plus" />Add task</button>
      </div>
      {error && <div className="alert alert-error" style={{ margin: '0 14px 14px' }} role="alert">{error}{' '}
        {error.includes('Upgrade') && <Link to="/pricing">See plans</Link>}</div>}
    </form>
  );
}

export function Tasks() {
  const { tasks, loading, error, reload, create, update, remove } = useTasks();
  const [view, setView] = useState('list');
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [priority, setPriority] = useState('all');
  const [actionError, setActionError] = useState('');

  const visible = useMemo(() => tasks.filter((t) =>
    (priority === 'all' || t.priority === priority) && t.title.toLowerCase().includes(query.trim().toLowerCase())), [tasks, query, priority]);

  const guard = (fn) => async (...a) => {
    setActionError('');
    try { await fn(...a); } catch (e) { setActionError(errorMessage(e)); }
  };
  const toggle = guard((t) => update(t.id, { status: t.completed ? 'todo' : 'done' }));
  const move = guard((t, status) => update(t.id, { status }));
  const del = guard((t) => (window.confirm(`Delete "${t.title}"?`) ? remove(t.id) : null));

  if (loading) return <Loading label="Loading tasks" />;
  return (
    <>
      <div className="page-head"><div><h1>Tasks</h1><p>Plan, prioritise and track your work.</p></div></div>
      <QuickAdd onCreate={create} />
      <div className="toolbar">
        <div className="tabs" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={16} />List</button>
          <button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')}><Icon name="board" size={16} />Board</button>
        </div>
        <div className="search">
          <Icon name="search" size={16} />
          <label className="sr-only" htmlFor="task-search">Search tasks</label>
          <input id="task-search" className="input" placeholder="Search tasks" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <label className="sr-only" htmlFor="task-prio">Filter by priority</label>
        <select id="task-prio" className="select" style={{ width: 'auto' }} value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>
      {(error || actionError) && (
        <div className="alert alert-error" style={{ marginBottom: 16 }} role="alert">
          {error || actionError}{error && <> <button type="button" className="link-btn" onClick={reload}>Retry</button></>}
        </div>
      )}
      {tasks.length === 0 && error ? null : tasks.length === 0
        ? <div className="card empty"><h3>No tasks yet</h3><p>Add your first task above to get started.</p></div>
        : view === 'list'
          ? <TaskList tasks={visible} onToggle={toggle} onDelete={del} />
          : <TaskBoard tasks={visible} onMove={move} onToggle={toggle} onDelete={del} />}
    </>
  );
}

function Tile({ tone, label, value, note, icon }) {
  return (
    <div className={`tile tile-${tone}`}>
      <div className="tile-top"><span>{label}</span><Icon name={icon} size={20} /></div>
      <div className="tile-value">{value}</div>
      <div className="tile-note">{note}</div>
    </div>
  );
}

function Radial({ percent }) {
  const R = 54; const C = 2 * Math.PI * R;
  return (
    <div className="radial" role="img" aria-label={`${percent} percent of tasks completed`}>
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <defs><linearGradient id="rad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6366f1" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="13" />
        <circle cx="70" cy="70" r={R} fill="none" stroke="url(#rad)" strokeWidth="13" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - percent / 100)} transform="rotate(-90 70 70)" />
      </svg>
      <div className="radial-label"><strong>{percent}%</strong><span>done</span></div>
    </div>
  );
}

export function Overview() {
  const { user } = useAuth();
  const { tasks, loading, error } = useTasks();
  const [trend, setTrend] = useState([]);
  useEffect(() => {
    let alive = true;
    api.get('/analytics/stats/').then((r) => alive && setTrend(r.data.daily_completion)).catch(() => {});
    return () => { alive = false; };
  }, [tasks.length]);
  if (loading) return <Loading />;

  const done = tasks.filter((t) => t.completed).length;
  const active = tasks.filter((t) => t.status === 'in_progress').length;
  const overdue = tasks.filter(isOverdue).length;
  const open = tasks.length - done;
  const dueToday = tasks.filter((t) => !t.completed && formatDue(t.due_date) === 'Today').length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const upcoming = tasks.filter((t) => !t.completed)
    .sort((a, b) => (parseDate(a.due_date) || Infinity) - (parseDate(b.due_date) || Infinity)).slice(0, 6);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const summary = tasks.length === 0 ? 'Add your first task to get started.'
    : `You have ${dueToday} ${dueToday === 1 ? 'task' : 'tasks'} due today${overdue ? ` and ${overdue} overdue` : ''}.`;

  return (
    <>
      <div className="page-head">
        <div><h1>{greeting}, {user.username}</h1><p>{summary}</p></div>
        <Link to="/app/tasks" className="btn"><Icon name="plus" />New task</Link>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }} role="alert">{error}</div>}
      <div className="tiles">
        <Tile tone="indigo" icon="tasks" label="Open tasks" value={open} note={`${tasks.length} in total`} />
        <Tile tone="sky" icon="activity" label="In progress" value={active} note="Being worked on now" />
        <Tile tone="violet" icon="check" label="Completed" value={done} note={`${percent}% completion rate`} />
        <Tile tone="coral" icon="alert" label="Overdue" value={overdue} note={overdue ? 'Needs attention' : 'Nothing overdue'} />
      </div>
      <div className="overview-grid">
        <div className="card card-pad">
          <h2 className="card-title">Completion trend</h2><p className="card-sub">Tasks completed in the last 7 days</p>
          <div className="chart-box" style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={{ fontSize: 13, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="var(--chart-1)" strokeWidth={3} fill="url(#area)" isAnimationActive={false} dot={{ r: 4, fill: 'var(--surface)', stroke: 'var(--chart-1)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card card-pad progress-card">
          <h2 className="card-title">Overall progress</h2><p className="card-sub">{done} of {tasks.length} tasks completed</p>
          <Radial percent={percent} />
          {!user.is_premium && (
            <div className="quota">
              <div className="quota-row"><span>Free plan</span><span>{tasks.length} / {FREE_LIMIT} tasks</span></div>
              <div className="meter"><span style={{ width: `${Math.min(100, (tasks.length / FREE_LIMIT) * 100)}%` }} /></div>
              <Link to="/pricing" className="btn btn-secondary btn-block" style={{ marginTop: 14 }}>Upgrade for unlimited</Link>
            </div>
          )}
        </div>
      </div>
      <div className="card card-pad" style={{ marginTop: 20 }}>
        <h2 className="card-title">Up next</h2>
        {upcoming.length === 0 ? <p className="empty">You are all caught up.</p> : (
          <ul style={{ marginTop: 8 }}>
            {upcoming.map((t) => (
              <li key={t.id} className="next-row">
                <span style={{ overflowWrap: 'anywhere' }}>{t.title}</span>
                <span className={isOverdue(t) ? 'badge badge-overdue' : 'due'}>{formatDue(t.due_date) || 'No date'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export function Focus() {
  const { user } = useAuth();
  const { tasks } = useTasks({ enabled: user.is_premium });
  return (
    <>
      <div className="page-head"><div><h1>Focus timer</h1><p>Work in distraction-free sessions and log your time.</p></div></div>
      {user.is_premium ? <FocusTimer tasks={tasks} /> : (
        <div className="card card-pad" style={{ maxWidth: 560 }}>
          <h2 className="card-title">The focus timer is a Premium feature</h2>
          <p className="card-sub" style={{ margin: '6px 0 16px' }}>Run timed sessions, link them to tasks and track your focus time.</p>
          <Link to="/pricing" className="btn">See plans</Link>
        </div>
      )}
    </>
  );
}

export function Insights() {
  return (
    <>
      <div className="page-head"><div><h1>Insights</h1><p>How your work is trending.</p></div></div>
      <Analytics />
    </>
  );
}
