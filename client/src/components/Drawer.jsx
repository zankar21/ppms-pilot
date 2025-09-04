import React, { useEffect, useRef } from "react";

/** Recursively split children into scrollable content and any elements with class "drawer-actions". */
function splitContentAndActions(node) {
  const actions = [];

  function walk(n) {
    if (n == null) return n;
    // Text / number / boolean / fragment nodes pass through
    if (!React.isValidElement(n)) return n;

    const cls = (n.props && n.props.className) || "";
    const isAction =
      typeof cls === "string" && cls.toLowerCase().includes("drawer-actions");

    if (isAction) {
      actions.push(n);
      return null; // remove from content
    }

    // Recurse into children
    const kids = React.Children.toArray(n.props.children);
    if (kids.length === 0) return n;

    const newKids = [];
    kids.forEach((k) => {
      const res = walk(k);
      if (res !== null && res !== undefined && !(Array.isArray(res) && res.length === 0)) {
        newKids.push(res);
      }
    });

    // If nothing changed, return original
    if (newKids.length === kids.length && newKids.every((k, i) => k === kids[i])) {
      return n;
    }
    return React.cloneElement(n, { ...n.props, children: newKids });
  }

  const content = walk(node);
  return { content, actions };
}

export default function Drawer({ open, title, onClose, children }) {
  const panelRef = useRef(null);

  // Lock body scroll & focus the panel (Esc works)
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

  // Split the provided children into scrollable content + fixed footer actions
  const { content, actions } = splitContentAndActions(children);

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
          height: "100dvh",           // mobile-correct height
          minHeight: "100vh",          // fallback
          width: "min(520px, 92vw)",
          transform: `translateX(${open ? "0" : "100%"})`,
          transition: "transform .25s ease",
          background: "linear-gradient(180deg, #0f172acc, #0b1220)",
          borderLeft: "1px solid #1f2937",
          boxShadow: "-24px 0 64px #0008, inset 0 1px 0 #ffffff10",
          display: "flex",
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
            flexShrink: 0,
          }}
        >
          <div className="brand-badge" style={{ width: 22, height: 22 }}>ℹ️</div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <button className="btn" style={{ marginLeft: "auto" }} onClick={onClose}>
            Close
          </button>
        </div>

        {/* Scrollable content area */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          {content}
        </div>

        {/* Fixed footer (only if .drawer-actions were found) */}
        {actions.length > 0 && (
          <div
            style={{
              flexShrink: 0,
              padding: "12px",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
              background: "rgba(2, 8, 23, 0.92)",
              backdropFilter: "blur(6px)",
              borderTop: "1px solid rgba(148,163,184,0.2)",
              display: "flex",
              gap: 8,
              zIndex: 10,
            }}
          >
            {actions.map((a, i) => React.cloneElement(a, { key: i }))}
          </div>
        )}
      </aside>
    </>
  );
}
