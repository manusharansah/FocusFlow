import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';

const COLORS = { high: '#b91c1c', medium: '#b45309', low: '#15803d' };
const AXIS = { fontSize: 12, fill: '#5b6475' };

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
        <div className="card stat"><div className="label">Total tasks</div><div className="value">{stats.total_tasks}</div></div>
        <div className="card stat"><div className="label">Completed</div><div className="value">{stats.completed_tasks}</div><div className="note">{rate}% completion rate</div></div>
        <div className="card stat"><div className="label">Pending</div><div className="value">{stats.pending_tasks}</div></div>
        {user.is_premium && (
          <div className="card stat"><div className="label">Focus time</div><div className="value">{focus.total_focus_time || 0}<small style={{ fontSize: 14, fontWeight: 500 }}> min</small></div>
            <div className="note">{focus.total_sessions || 0} sessions</div></div>
        )}
      </div>
      <div className="grid-2">
        <div className="card card-pad">
          <h2 className="card-title">Tasks completed</h2><p className="card-sub">Last 7 days</p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.daily_completion} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e4e7ef" strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f3f9' }} />
                <Bar isAnimationActive={false} dataKey="completed" name="Completed" fill="#4f46e5" radius={[4, 4, 0, 0]} />
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
                      {pie.map((p) => <Cell key={p.name} fill={COLORS[p.name]} />)}
                    </Pie>
                    <Tooltip />
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
                <CartesianGrid vertical={false} stroke="#e4e7ef" strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f3f9' }} />
                <Bar isAnimationActive={false} dataKey="minutes" name="Minutes" fill="#4f46e5" radius={[4, 4, 0, 0]} />
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
