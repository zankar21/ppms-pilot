import React from 'react';

export default function SemanticResults({ items = [], onOpen }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 grid gap-2">
      {items.map((it, idx) => (
        <div key={idx} className="rounded-xl border border-slate-700/50 p-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">{it.title || 'Logbook note'}</div>
            {typeof it.score === 'number' && (
              <span className="text-xs opacity-70">score: {it.score.toFixed(3)}</span>
            )}
          </div>
          {it.body && (
            <p className="text-sm opacity-80 mt-1 line-clamp-3">{it.body}</p>
          )}
          <div className="text-xs mt-1 opacity-70">
            {it.unit ? `[${it.unit}]` : ''} {it.department ? `• ${it.department}` : ''} {it.date ? `• ${new Date(it.date).toLocaleString()}` : ''}
          </div>
          {onOpen && (
            <div className="mt-2">
              <button onClick={()=>onOpen(it)} className="text-sm underline">Open</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
