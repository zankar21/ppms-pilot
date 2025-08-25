import React from 'react';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Maintenance from './pages/Maintenance.jsx';
import Logbook from './pages/Logbook.jsx';

const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    padding:'8px 14px', marginRight:8, border:'1px solid #ddd',
    background: active ? '#222' : '#fff', color: active ? '#fff' : '#000',
    borderRadius:6, cursor:'pointer'
  }}>{children}</button>
);

export default function App() {
  const [tab, setTab] = useState('dashboard');
  useEffect(()=>{ document.title = 'PPMS Pilot'; },[]);
  return (
    <div style={{ maxWidth: 1100, margin:'0 auto', padding:20 }}>
      <h1>PPMS Pilot</h1>
      <div style={{ margin:'12px 0 20px' }}>
        <TabButton active={tab==='dashboard'} onClick={()=>setTab('dashboard')}>Dashboard</TabButton>
        <TabButton active={tab==='inventory'} onClick={()=>setTab('inventory')}>Inventory</TabButton>
        <TabButton active={tab==='maintenance'} onClick={()=>setTab('maintenance')}>Maintenance</TabButton>
        <TabButton active={tab==='logbook'} onClick={()=>setTab('logbook')}>Logbook</TabButton>
      </div>
      {tab==='dashboard' && <Dashboard/>}
      {tab==='inventory' && <Inventory/>}
      {tab==='maintenance' && <Maintenance/>}
      {tab==='logbook' && <Logbook/>}
      <footer style={{marginTop:30, fontSize:12, color:'#666'}}>© PowerPulse Technologies</footer>
    </div>
  );
}
