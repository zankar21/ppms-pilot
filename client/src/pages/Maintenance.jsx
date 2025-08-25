import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Maintenance() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ type:'BD', equipment_tag:'', fault:'' });

  const load = async () => {
    const r = await api.get('/api/maintenance');
    setRows(r.data.rows);
  };
  useEffect(()=>{ load(); },[]);

  const submit = async () => {
    await api.post('/api/maintenance', form);
    setForm({ type:'BD', equipment_tag:'', fault:'' });
    load();
  };

  return (
    <div>
      <h3>Maintenance Records</h3>
      <div style={{ display:'flex', gap:8, margin:'10px 0', flexWrap:'wrap' }}>
        <select value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>
          <option>PM</option><option>CM</option><option>BD</option>
        </select>
        <input placeholder="Equipment Tag" value={form.equipment_tag} onChange={e=>setForm({...form, equipment_tag:e.target.value})}/>
        <input placeholder="Fault" value={form.fault} onChange={e=>setForm({...form, fault:e.target.value})}/>
        <button onClick={submit}>Add</button>
      </div>

      <table width="100%" border="1" cellPadding="6" style={{ borderCollapse:'collapse' }}>
        <thead><tr>
          <th>When</th><th>Type</th><th>Equipment</th><th>Fault</th>
        </tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r._id}>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.type}</td>
              <td>{r.equipment_tag}</td>
              <td>{r.fault}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
