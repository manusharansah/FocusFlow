import React from 'react';

export default function Loading({ label = 'Loading' }) {
  return (
    <div className="center-screen" role="status" aria-live="polite">
      <div><div className="spinner" /><p className="card-sub">{label}...</p></div>
    </div>
  );
}
