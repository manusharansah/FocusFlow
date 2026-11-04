import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../utils/api';
import { formatDue, isOverdue, parseDate } from '../utils/format';
import Analytics from '../components/Analytics';
import FocusTimer from '../components/FocusTimer';
import Icon from '../components/Icon';
import Loading from '../components/Loading';
import { TaskBoard, TaskList } from '../components/TaskViews';
import useTasks from '../components/useTasks';

const FREE_LIMIT = 10;

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
  const [query, setQuery] = useState('');
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

export function Overview() {
  const { user } = useAuth();
  const { tasks, loading, error } = useTasks();
  if (loading) return <Loading />;

  const done = tasks.filter((t) => t.completed).length;
  const active = tasks.filter((t) => t.status === 'in_progress').length;
  const overdue = tasks.filter(isOverdue).length;
  const upcoming = tasks.filter((t) => !t.completed)
    .sort((a, b) => (parseDate(a.due_date) || Infinity) - (parseDate(b.due_date) || Infinity)).slice(0, 6);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <div className="page-head">
        <div><h1>{greeting}, {user.username}</h1><p>Here is where things stand today.</p></div>
        <Link to="/app/tasks" className="btn"><Icon name="plus" />New task</Link>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }} role="alert">{error}</div>}
      <div className="stats">
        <div className="card stat"><div className="label">Open tasks</div><div className="value">{tasks.length - done}</div></div>
        <div className="card stat"><div className="label">In progress</div><div className="value">{active}</div></div>
        <div className="card stat"><div className="label">Completed</div><div className="value">{done}</div></div>
        <div className="card stat"><div className="label">Overdue</div><div className="value" style={overdue ? { color: 'var(--danger)' } : undefined}>{overdue}</div></div>
      </div>
      {!user.is_premium && (
        <div className="card card-pad" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h2 className="card-title">{tasks.length} of {FREE_LIMIT} free tasks used</h2>
              <div className="meter" style={{ marginTop: 10 }}><span style={{ width: `${Math.min(100, (tasks.length / FREE_LIMIT) * 100)}%` }} /></div>
            </div>
            <Link to="/pricing" className="btn btn-secondary">Upgrade for unlimited</Link>
          </div>
        </div>
      )}
      <div className="card card-pad">
        <h2 className="card-title">Up next</h2>
        {upcoming.length === 0 ? <p className="empty">You are all caught up.</p> : (
          <ul style={{ marginTop: 8 }}>
            {upcoming.map((t) => (
              <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
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
