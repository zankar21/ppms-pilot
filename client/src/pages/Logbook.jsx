import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Logbook() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ date:'', shift:'A', unit:'Unit-1', summary:'' });

  const load = async () => {
    const r = await api.get('/api/logbook');
    setRows(r.data.rows);
  };
  useEffect(()=>{ load(); },[]);

  const submit = async () => {
    await api.post('/api/logbook', form);
    setForm({ date:'', shift:'A', unit:'Unit-1', summary:'' });
    load();
  };

  return (
    <div>
      <h3>Daily Logbook</h3>
      <div style={{ display:'flex', gap:8, margin:'10px 0', flexWrap:'wrap' }}>
        <input type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})}/>
        <select value={form.shift} onChange={e=>setForm({...form, shift:e.target.value})}>
          <option>A</option><option>B</option><option>C</option>
        </select>
        <input placeholder="Unit" value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})}/>
        <input placeholder="Summary" value={form.summary} onChange={e=>setForm({...form, summary:e.target.value})}/>
        <button onClick={submit}>Add</button>
      </div>

      <table width="100%" border="1" cellPadding="6" style={{ borderCollapse:'collapse' }}>
        <thead><tr>
          <th>Date</th><th>Shift</th><th>Unit</th><th>Summary</th>
        </tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r._id}>
              <td>{r.date}</td>
              <td>{r.shift}</td>
              <td>{r.unit}</td>
              <td>{r.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
