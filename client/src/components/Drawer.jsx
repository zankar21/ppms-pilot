import React, { useEffect, useRef } from "react";

export default function Drawer({ open, title, onClose, children }) {
  const panelRef = useRef(null);

  // Lock body scroll when open & focus panel so Esc works
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose?.();
  };

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
          zIndex: 40,
        }}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        onKeyDown={handleKeyDown}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100dvh",            // dynamic viewport height (mobile-safe)
          minHeight: "100vh",           // ✅ fallback if dvh is unsupported
          width: "min(520px, 92vw)",
          transform: `translateX(${open ? "0" : "100%"})`,
          transition: "transform .25s ease",
          background: "linear-gradient(180deg, #0f172acc, #0b1220)",
          borderLeft: "1px solid #1f2937",
          boxShadow: "-24px 0 64px #0008, inset 0 1px 0 #ffffff10",
          display: "flex",              // column layout
          flexDirection: "column",
          zIndex: 50,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header (non-scrolling) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 16,
            borderBottom: "1px solid #1f2937",
            flexShrink: 0,              // never shrinks
          }}
        >
          <div className="brand-badge" style={{ width: 22, height: 22 }}>ℹ️</div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <button className="btn" style={{ marginLeft: "auto" }} onClick={onClose}>
            Close
          </button>
        </div>

        {/* Content container: children control their own scroll */}
        <div
          style={{
            flex: 1,
            minHeight: 0,               // ✅ allows inner overflow to work
            overflow: "hidden",         // child decides scrolling (as in Logbook/Maintenance)
          }}
        >
          {children}
        </div>
      </aside>
    </>
  );
}
