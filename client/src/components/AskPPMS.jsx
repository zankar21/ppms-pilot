import React, { useState } from 'react';
import { api } from '../services/api';
import SemanticResults from './SemanticResults';

/**
 * AskPPMS - semantic search bar powered by Atlas Vector Search.
 * Props:
 *  - unit, department (optional filters)
 *  - placeholder (string)
 *  - limit (number)
 *  - onOpen(item) -> optional callback to open a result drawer
 */
export default function AskPPMS({ unit = '', department = '', placeholder = 'Ask PPMS anything…', limit = 8, onOpen }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/search/semantic', { q, unit: unit || undefined, department: department || undefined, limit });
      setItems(data.results || []);
    } catch (err) {
      console.error(err);
      setError('Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-slate-700/40 p-3 mb-4 bg-slate-900/40">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none px-3 py-2 rounded-xl border border-slate-700/50"
        />
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl border border-slate-700/60">
          {loading ? 'Searching…' : 'Ask'}
        </button>
      </form>
      {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
      <SemanticResults items={items} onOpen={onOpen} />
    </div>
  );
}
