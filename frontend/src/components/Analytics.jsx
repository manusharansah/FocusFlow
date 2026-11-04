import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';
import StatCard from './StatCard';

const COLORS = { high: 'var(--danger)', medium: 'var(--chart-3)', low: 'var(--chart-2)' };
const AXIS = { fontSize: 13, fill: 'var(--muted)' };

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tip"><strong>{label ?? payload[0].name}</strong><div>{payload[0].name}: {payload[0].value}</div></div>;
}

export default function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/analytics/stats/').then((r) => alive && setStats(r.data))
      .catch((e) => alive && setError(errorMessage(e, 'Could not load insights.')));
    return () => { alive = false; };
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return <Loading label="Loading insights" />;

  const rate = stats.total_tasks ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0;
  const pie = Object.entries(stats.tasks_by_priority).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const focus = stats.focus_data;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stats">
        <StatCard label="Total tasks" value={stats.total_tasks} icon="tasks" tone="indigo" />
        <StatCard label="Completed" value={stats.completed_tasks} note={`${rate}% completion rate`} icon="check" tone="emerald" />
        <StatCard label="Pending" value={stats.pending_tasks} icon="activity" tone="amber" />
        {user.is_premium && <StatCard label="Focus time" value={focus.total_focus_time || 0} unit="min" note={`${focus.total_sessions || 0} sessions`} icon="timer" tone="sky" />}
      </div>
      <div className="grid-2">
        <div className="card card-pad">
          <h2 className="card-title">Tasks completed</h2><p className="card-sub">Last 7 days</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.daily_completion} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<Tip />} />
                <Bar isAnimationActive={false} dataKey="completed" name="Completed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card card-pad">
          <h2 className="card-title">By priority</h2><p className="card-sub">All tasks</p>
          {pie.length === 0 ? <p className="empty">No tasks yet.</p> : (
            <>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie isAnimationActive={false} data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {pie.map((p) => <Cell key={p.name} fill={COLORS[p.name]} stroke="var(--surface)" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="legend">
                {pie.map((p) => <span key={p.name}><i style={{ background: COLORS[p.name] }} />{p.name[0].toUpperCase() + p.name.slice(1)} ({p.value})</span>)}
              </div>
            </>
          )}
        </div>
      </div>
      {user.is_premium ? (
        <div className="card card-pad">
          <h2 className="card-title">Focus minutes</h2><p className="card-sub">Last 7 days</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={focus.daily_focus} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<Tip />} />
                <Bar isAnimationActive={false} dataKey="minutes" name="Minutes" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div><h2 className="card-title">Advanced insights</h2><p className="card-sub">Focus time trends and session history are part of Premium.</p></div>
          <Link to="/pricing" className="btn">See plans</Link>
        </div>
      )}
    </div>
  );
}
