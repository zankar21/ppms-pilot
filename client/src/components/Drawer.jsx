import React from 'react';

export default function Drawer({ open, title, onClose, children }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto':'none',
          transition:'opacity .2s ease'
        }}
      />
      {/* Panel */}
      <aside
        style={{
          position:'fixed', top:0, right:0, height:'100vh', width:'min(520px, 92vw)',
          transform:`translateX(${open? '0':'100%'})`,
          transition:'transform .25s ease',
          background:'linear-gradient(180deg, #0f172acc, #0b1220)',
          borderLeft:'1px solid #1f2937', boxShadow:'-24px 0 64px #0008, inset 0 1px 0 #ffffff10',
          padding:'16px', display:'flex', flexDirection:'column', gap:12, zIndex:50
        }}
        role="dialog" aria-modal="true"
      >
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div className="brand-badge" style={{width:22,height:22}}>ℹ️</div>
          <div style={{fontWeight:700}}>{title}</div>
          <button className="btn" style={{marginLeft:'auto'}} onClick={onClose}>Close</button>
        </div>
        <div style={{overflow:'auto'}}>{children}</div>
      </aside>
    </>
  );
}
