import React, { useState } from 'react';
import Icon from './Icon';
import { PRIORITIES, STATUSES, formatDue, isOverdue } from '../utils/format';

function Meta({ task, placeholder = false }) {
  const due = formatDue(task.due_date);
  return (
    <>
      <span className={`badge badge-${task.priority}`}>{PRIORITIES.find((p) => p.key === task.priority)?.label}</span>
      {!due && placeholder && <span />}
      {due && <span className={`due${isOverdue(task) ? ' badge badge-overdue' : ''}`}>{due}</span>}
    </>
  );
}

function CheckButton({ task, onToggle }) {
  return (
    <button type="button" className="check" role="checkbox" aria-checked={task.completed}
      aria-label={`Mark "${task.title}" as ${task.completed ? 'not done' : 'done'}`} onClick={() => onToggle(task)}>
      {task.completed && <Icon name="check" size={12} strokeWidth={3.5} />}
    </button>
  );
}

export function TaskList({ tasks, onToggle, onDelete }) {
  const [collapsed, setCollapsed] = useState({});
  if (!tasks.length) {
    return <div className="card empty"><h3>No tasks match</h3><p>Add a task above or change your filters.</p></div>;
  }
  return STATUSES.map((s) => {
    const items = tasks.filter((t) => t.status === s.key);
    if (!items.length) return null;
    const isCollapsed = collapsed[s.key];
    return (
      <section className="group" key={s.key} aria-label={s.label}>
        <button type="button" className="group-head btn-ghost" style={{ border: 0, background: 'none', cursor: 'pointer', width: '100%' }}
          aria-expanded={!isCollapsed} onClick={() => setCollapsed((c) => ({ ...c, [s.key]: !c[s.key] }))}>
          <span className={`dot ${s.key}`} />{s.label}<span className="count">{items.length}</span>
        </button>
        {!isCollapsed && (
          <ul className="card rows">
            {items.map((t) => (
              <li key={t.id} className={`row${t.completed ? ' done' : ''}`}>
                <CheckButton task={t} onToggle={onToggle} />
                <span className="title" title={t.title}>{t.title}</span>
                <Meta task={t} placeholder />
                <button className="icon-btn" aria-label={`Delete "${t.title}"`} onClick={() => onDelete(t)}><Icon name="trash" size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  });
}

export function TaskBoard({ tasks, onMove, onToggle, onDelete }) {
  const [over, setOver] = useState(null);
  const drop = (e, status) => {
    e.preventDefault();
    setOver(null);
    const id = Number(e.dataTransfer.getData('text/plain'));
    const task = tasks.find((t) => t.id === id);
    if (task && task.status !== status) onMove(task, status);
  };
  return (
    <div className="board">
      {STATUSES.map((s) => {
        const items = tasks.filter((t) => t.status === s.key);
        return (
          <section key={s.key} className={`column${over === s.key ? ' over' : ''}`} aria-label={s.label}
            onDragOver={(e) => { e.preventDefault(); setOver(s.key); }}
            onDragLeave={() => setOver(null)} onDrop={(e) => drop(e, s.key)}>
            <div className="column-head"><span className={`dot ${s.key}`} />{s.label}<span className="count">{items.length}</span></div>
            {items.map((t) => (
              <article key={t.id} className="tcard" draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(t.id)); e.dataTransfer.effectAllowed = 'move'; }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <CheckButton task={t} onToggle={onToggle} />
                  <span className="title" style={t.completed ? { color: 'var(--muted)', textDecoration: 'line-through' } : undefined}>{t.title}</span>
                </div>
                <div className="meta"><Meta task={t} /></div>
                <div className="foot">
                  <label className="sr-only" htmlFor={`mv-${t.id}`}>Move task</label>
                  <select id={`mv-${t.id}`} value={t.status} onChange={(e) => onMove(t, e.target.value)}>
                    {STATUSES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                  <button className="icon-btn" aria-label={`Delete "${t.title}"`} onClick={() => onDelete(t)}><Icon name="trash" size={16} /></button>
                </div>
              </article>
            ))}
            {!items.length && <p className="hint" style={{ padding: 8 }}>Nothing here yet.</p>}
          </section>
        );
      })}
    </div>
  );
}
