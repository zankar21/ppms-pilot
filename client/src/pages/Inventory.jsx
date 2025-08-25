import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');

  const load = async () => {
    const r = await api.get('/api/inventory/items', { params: { q } });
    setRows(r.data.rows);
  };
  useEffect(()=>{ load(); },[]);

  return (
    <div>
      <h3>Inventory Items</h3>
      <div style={{ display:'flex', gap:8, margin:'10px 0' }}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search part no / description" />
        <button onClick={load}>Search</button>
      </div>
      <table width="100%" border="1" cellPadding="6" style={{ borderCollapse:'collapse' }}>
        <thead><tr>
          <th>Part No</th><th>Description</th><th>UOM</th><th>Min</th><th>Max</th><th>Location</th>
        </tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r._id}>
              <td>{r.part_no}</td>
              <td>{r.description}</td>
              <td>{r.uom}</td>
              <td>{r.min}</td>
              <td>{r.max}</td>
              <td>{r.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
