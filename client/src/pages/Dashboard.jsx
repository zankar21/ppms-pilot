import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [snap, setSnap] = useState(null);
  useEffect(()=>{
    api.get('/api/dashboard').then(r=>setSnap(r.data));
  },[]);

  // mock trend display until you add real time-series
  const trend = [
    { name:'W1', failures: 3, issues: 6 },
    { name:'W2', failures: 2, issues: 5 },
    { name:'W3', failures: 4, issues: 7 },
    { name:'W4', failures: 1, issues: 3 },
  ];

  if (!snap) return <div>Loading…</div>;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        <Tile title="Inventory Items" value={snap.inventory_items}/>
        <Tile title="Inventory Txns" value={snap.inventory_txns}/>
        <Tile title="Maintenance" value={snap.maintenance}/>
        <Tile title="Logbook Entries" value={snap.logbook}/>
      </div>

      <h3 style={{ marginTop:20 }}>Breakdown Trend (mock)</h3>
      <div style={{ height:300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name"/>
            <YAxis/>
            <Tooltip/>
            <Line type="monotone" dataKey="failures" />
            <Line type="monotone" dataKey="issues" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const Tile = ({ title, value }) => (
  <div style={{ border:'1px solid #ddd', borderRadius:8, padding:14 }}>
    <div style={{ fontSize:12, color:'#666' }}>{title}</div>
    <div style={{ fontSize:24, fontWeight:700 }}>{value}</div>
  </div>
);
