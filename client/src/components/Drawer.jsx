import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function Drawer({ open, title, onClose, children, actions = null }) {
  const panelRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const [vh, setVh] = useState(0);          // measured viewport px height
  const [headerH, setHeaderH] = useState(0);
  const [footerH, setFooterH] = useState(0);

  // ---- Measure viewport height (robust on mobile & with keyboard) ----
  useLayoutEffect(() => {
    if (!open) return;

    const vv = typeof window !== "undefined" && window.visualViewport;
    const measure = () => {
      const h = vv?.height ? Math.round(vv.height) : Math.round(window.innerHeight || 0);
      setVh(h > 0 ? h : 0);
      setHeaderH(headerRef.current?.offsetHeight || 0);
      setFooterH(footerRef.current?.offsetHeight || 0);
    };

    measure();
    const r1 = vv?.addEventListener?.("resize", measure);
    const r2 = vv?.addEventListener?.("scroll", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    const tid = setInterval(measure, 250);  // handle soft-keyboard animations

    return () => {
      vv?.removeEventListener?.("resize", measure);
      vv?.removeEventListener?.("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      clearInterval(tid);
    };
  }, [open]);

  // ---- Lock background scroll & focus panel ----
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panelRef.current?.focus(), 0);
    return () => { document.body.style.overflow = prev; clearTimeout(t); };
  }, [open]);

  const onKeyDown = (e) => { if (e.key === "Escape") onClose?.(); };

  // Compute scroll area height (viewport − header − footer)
  const scrollH = Math.max(0, vh - headerH - (actions ? footerH : 0));

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
          zIndex: 3000,
        }}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        onKeyDown={onKeyDown}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "min(520px, 92vw)",
          height: vh ? `${vh}px` : "100dvh", // measured height first, dvh fallback
          transform: `translateX(${open ? "0" : "100%"})`,
          transition: "transform .25s ease",
          background: "linear-gradient(180deg, #0f172acc, #0b1220)",
          borderLeft: "1px solid #1f2937",
          boxShadow: "-24px 0 64px #0008, inset 0 1px 0 #ffffff10",
          zIndex: 4000,                         // above everything
          pointerEvents: open ? "auto" : "none",
          overflow: "hidden",                   // we control scroll in the body
        }}
      >
        {/* Header (measured height) */}
        <div
          ref={headerRef}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 16,
            borderBottom: "1px solid #1f2937",
            background: "transparent",
          }}
        >
          <div className="brand-badge" style={{ width: 22, height: 22 }}>ℹ️</div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <button className="btn" style={{ marginLeft: "auto" }} onClick={onClose}>Close</button>
        </div>

        {/* Scroll area (absolute, sized by measured header/footer) */}
        <div
          style={{
            position: "absolute",
            top: headerH,
            left: 0,
            right: 0,
            height: `${scrollH}px`,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            padding: 12,
            paddingBottom: 12,
          }}
        >
          {children}
        </div>

        {/* Fixed/absolute footer (measured) */}
        {actions && (
          <div
            ref={footerRef}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
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
