import React, { useEffect, useRef } from "react";

/** Recursively walk children; remove any element with class "drawer-actions"
 *  from the scrollable content and collect them to render in a fixed footer. */
function splitContentAndActions(children) {
  const actions = [];

  const walk = (node) => {
    // primitives / null / booleans pass through
    if (!React.isValidElement(node)) return node;

    const cls = (node.props && node.props.className) || "";
    if (typeof cls === "string" && cls.toLowerCase().includes("drawer-actions")) {
      actions.push(node);
      return null; // remove from content
    }

    const kids = React.Children.toArray(node.props.children);
    if (kids.length === 0) return node;

    const newKids = [];
    kids.forEach((k) => {
      if (Array.isArray(k)) {
        // handle nested arrays (rare)
        const inner = React.Children.toArray(k).map(walk).filter((x) => x != null);
        newKids.push(...inner);
      } else {
        const res = walk(k);
        if (res != null) newKids.push(res);
      }
    });

    // If children changed, clone; otherwise return original node
    if (newKids.length !== kids.length || newKids.some((k, i) => k !== kids[i])) {
      return React.cloneElement(node, { ...node.props, children: newKids });
    }
    return node;
  };

  // Support top-level arrays/fragments
  const contentNodes = [];
  React.Children.toArray(children).forEach((child) => {
    const res = walk(child);
    if (res != null) contentNodes.push(res);
  });

  return { content: contentNodes, actions };
}

export default function Drawer({ open, title, onClose, children }) {
  const panelRef = useRef(null);

  // Lock body scroll; focus panel so Esc works
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

  const onKeyDown = (e) => {
    if (e.key === "Escape") onClose?.();
  };

  const { content, actions } = splitContentAndActions(children);
  const hasFooter = actions.length > 0;

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
        onKeyDown={onKeyDown}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100dvh",          // mobile-correct viewport height
          minHeight: "100vh",         // fallback
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
        {/* Header */}
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
            // Reserve space so last fields aren't hidden under footer
            paddingBottom: hasFooter ? "calc(84px + env(safe-area-inset-bottom, 0px))" : 12,
          }}
        >
          {content}
        </div>

        {/* Fixed footer: render any .drawer-actions here */}
        {hasFooter && (
          <div
            style={{
              flexShrink: 0,
              padding: 12,
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
              background: "rgba(2, 8, 23, 0.92)",
              backdropFilter: "blur(6px)",
              borderTop: "1px solid rgba(148,163,184,0.2)",
              display: "flex",
              gap: 8,
              zIndex: 100, // ensure above content
            }}
          >
            {actions.map((a, i) => (
              // strip sticky class if present so it behaves inside fixed footer
              <div key={i} style={{ display: "contents" }}>
                {React.cloneElement(a, {
                  className: String(a.props.className || "")
                    .replace(/drawer-actions/g, "")
                    .trim(),
                  style: undefined,
                })}
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
