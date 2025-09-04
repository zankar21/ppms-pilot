import React, { useEffect, useRef } from "react";

export default function Drawer({ open, title, onClose, children, actions = null }) {
  const panelRef = useRef(null);

  // Lock background scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panelRef.current?.focus(), 0);
    return () => { document.body.style.overflow = prev; clearTimeout(t); };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.45)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .2s ease",
          zIndex: 1000,
        }}
      />

      {/* Panel: header (no scroll) | body (scroll) | footer (no scroll) */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100dvh",         // mobile-safe viewport height
          minHeight: "100vh",
          width: "min(520px, 92vw)",
          transform: `translateX(${open ? "0" : "100%"})`,
          transition: "transform .25s ease",
          background: "linear-gradient(180deg, #0f172acc, #0b1220)",
          borderLeft: "1px solid #1f2937",
          boxShadow: "-24px 0 64px #0008, inset 0 1px 0 #ffffff10",
          zIndex: 1100,
          display: "flex",
          flexDirection: "column",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 16,
            borderBottom: "1px solid #1f2937",
          }}
        >
          <div className="brand-badge" style={{ width: 22, height: 22 }}>ℹ️</div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <button className="btn" style={{ marginLeft: "auto" }} onClick={onClose}>Close</button>
        </div>

        {/* Scrollable body (the important bits are flex:1 and minHeight:0) */}
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,               // ✅ allows this area to shrink and scroll
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            padding: 12,
            paddingBottom: actions ? 16 : 12,
          }}
        >
          {children}
        </div>

        {/* Fixed footer (if provided) */}
        {actions && (
          <div
            style={{
              flex: "0 0 auto",
              padding: 12,
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
              background: "rgba(2, 8, 23, 0.92)",
              backdropFilter: "blur(6px)",
              borderTop: "1px solid rgba(148,163,184,0.2)",
              display: "flex",
              gap: 8,
            }}
          >
            {actions}
          </div>
        )}
      </aside>
    </>
  );
}
