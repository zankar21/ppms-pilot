import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import Drawer from '../components/Drawer.jsx';
import Filters from '../components/Filters.jsx';

export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [unit, setUnit] = useState('');
  const [dept, setDept] = useState('');

  const [newItem, setNewItem] = useState({
    part_no:'', description:'', uom:'', min:0, max:0, location:'', unit:'UNIT-1', department:'MECH'
  });

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const r = await api.get('/api/inventory/items', { params: { q, unit, dept } });
    setRows(r.data.rows);
  };
  useEffect(()=>{ load(); },[unit, dept]);

  const search = async () => load();

  const add = async () => {
    if (!newItem.part_no) return;
    await api.post('/api/inventory/items', newItem).catch(e=>alert(e.response?.data?.error || e.message));
    setNewItem({ part_no:'', description:'', uom:'', min:0, max:0, location:'', unit:'UNIT-1', department:'MECH' });
    load();
  };

  const show = (row) => { setEdit({...row}); setOpen(true); };
  const onChange = (k,v) => setEdit(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        part_no: edit.part_no,
        description: edit.description || '',
        uom: edit.uom || '',
        min: Number(edit.min||0),
        max: Number(edit.max||0),
        location: edit.location || '',
        unit: edit.unit || '',
        department: edit.department || ''
      };
      await api.put(`/api/inventory/items/${edit._id}`, payload);
      await load();
      setOpen(false);
    } finally { setSaving(false); }
  };

  const removeOne = async () => {
    if (!confirm('Delete this item?')) return;
    setDeleting(true);
    try {
      await api.delete(`/api/inventory/items/${edit._id}`);
      await load();
      setOpen(false);
    } finally { setDeleting(false); }
  };

  return (
    <div className="card">
      <Filters unit={unit} setUnit={setUnit} dept={dept} setDept={setDept} />

      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 80px', gap:10, marginBottom:12}}>
        <input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search part no / description / location" />
        <button className="btn" onClick={search}>Search</button>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="label" style={{marginBottom:8}}>Add New Item</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(8, minmax(0,1fr))', gap:10}}>
          <input className="input" placeholder="Part No" value={newItem.part_no} onChange={e=>setNewItem({...newItem, part_no:e.target.value})}/>
          <input className="input" placeholder="Description" value={newItem.description} onChange={e=>setNewItem({...newItem, description:e.target.value})}/>
          <input className="input" placeholder="UOM" value={newItem.uom} onChange={e=>setNewItem({...newItem, uom:e.target.value})}/>
          <input className="input" type="number" placeholder="Min" value={newItem.min} onChange={e=>setNewItem({...newItem, min:e.target.value})}/>
          <input className="input" type="number" placeholder="Max" value={newItem.max} onChange={e=>setNewItem({...newItem, max:e.target.value})}/>
          <input className="input" placeholder="Location" value={newItem.location} onChange={e=>setNewItem({...newItem, location:e.target.value})}/>
          <input className="input" placeholder="Unit (e.g. UNIT-1)" value={newItem.unit} onChange={e=>setNewItem({...newItem, unit:e.target.value})}/>
          <input className="input" placeholder="Dept (e.g. MECH)" value={newItem.department} onChange={e=>setNewItem({...newItem, department:e.target.value})}/>
        </div>
        <div style={{marginTop:10}}>
          <button className="btn" onClick={add}>Add Item</button>
        </div>
      </div>

      <table className="table">
        <thead><tr>
          <th>Part No</th><th>Description</th><th>UOM</th><th>Min</th><th>Max</th><th>Location</th><th>Unit</th><th>Dept</th>
        </tr></thead>
        <tbody>
        {rows.map(r=>(
          <tr key={r._id} style={{cursor:'pointer'}} onClick={()=>show(r)}>
            <td style={{fontWeight:700}}>{r.part_no}</td>
            <td>{r.description}</td>
            <td>{r.uom}</td>
            <td>{r.min}</td>
            <td>{r.max}</td>
            <td>{r.location}</td>
            <td>{r.unit}</td>
            <td>{r.department}</td>
          </tr>
        ))}
        </tbody>
      </table>

      <Drawer open={open} title="Edit Item" onClose={()=>setOpen(false)}>
        {!edit ? null : (
          <div className="grid grid-2">
            <div className="card"><div className="label">Part No</div><input className="input" value={edit.part_no} onChange={e=>onChange('part_no',e.target.value)} /></div>
            <div className="card"><div className="label">UOM</div><input className="input" value={edit.uom||''} onChange={e=>onChange('uom',e.target.value)} /></div>
            <div className="card" style={{gridColumn:'1 / -1'}}><div className="label">Description</div><input className="input" value={edit.description||''} onChange={e=>onChange('description',e.target.value)} /></div>
            <div className="card"><div className="label">Min</div><input className="input" type="number" value={edit.min??0} onChange={e=>onChange('min',e.target.value)} /></div>
            <div className="card"><div className="label">Max</div><input className="input" type="number" value={edit.max??0} onChange={e=>onChange('max',e.target.value)} /></div>
            <div className="card"><div className="label">Location</div><input className="input" value={edit.location||''} onChange={e=>onChange('location',e.target.value)} /></div>
            <div className="card"><div className="label">Unit</div><input className="input" value={edit.unit||''} onChange={e=>onChange('unit',e.target.value)} /></div>
            <div className="card"><div className="label">Dept</div><input className="input" value={edit.department||''} onChange={e=>onChange('department',e.target.value)} /></div>
            <div style={{display:'flex', gap:10, gridColumn:'1 / -1'}}>
              <button className="btn" onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</button>
              <button className="btn" onClick={removeOne} disabled={deleting} style={{borderColor:'#ef4444', color:'#ef4444'}}>
                {deleting?'Deleting…':'Delete'}
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
