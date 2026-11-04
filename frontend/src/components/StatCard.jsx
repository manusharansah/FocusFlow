import React from 'react';
import Icon from './Icon';

export default function StatCard({ label, value, note, icon, tone = 'indigo', unit }) {
  return (
    <div className="card stat">
      <span className={`stat-ico ${tone}`}><Icon name={icon} size={22} /></span>
      <div>
        <div className="label">{label}</div>
        <div className="value">{value}{unit && <small style={{ fontSize: 15, fontWeight: 500, color: 'var(--muted)' }}> {unit}</small>}</div>
        {note && <div className="note">{note}</div>}
      </div>
    </div>
  );
}
