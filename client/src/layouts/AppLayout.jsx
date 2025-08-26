// client/src/layouts/AppLayout.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Boxes, Wrench, NotebookText, ShieldCheck, LogOut, UserCog,
  BarChart3, TrendingUp, Menu, X
} from "lucide-react";

function SidebarLink({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => "btn tab" + (isActive ? " active" : "")}
      onClick={onClick}
    >
      {Icon && <Icon size={16} />}
      {label}
    </NavLink>
  );
}

export default function AppLayout({ children }) {
  const [open, setOpen] = useState(false);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("ppms_user") || "null"); }
    catch { return null; }
  })();

  function handleLogout() {
    localStorage.removeItem("ppms_jwt");
    localStorage.removeItem("ppms_user");
    window.location.href = "/login";
  }

  const closeMenu = () => setOpen(false);

  return (
    <div className="app">
      {/* Sidebar (desktop + mobile off-canvas) */}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-badge"><ShieldCheck size={16} color="white" /></div>
          PPMS
          {/* Mobile close button */}
          <button className="btn icon only-mobile" onClick={() => setOpen(false)} aria-label="Close menu" style={{ marginLeft: "auto" }}>
            <X size={18} />
          </button>
        </div>

        <nav className="tabs" style={{ marginTop: 20, flexDirection: "column" }}>
          <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" onClick={closeMenu} />
          <SidebarLink to="/inventory" icon={Boxes} label="Inventory" onClick={closeMenu} />
          <SidebarLink to="/maintenance" icon={Wrench} label="Maintenance" onClick={closeMenu} />
          <SidebarLink to="/logbook" icon={NotebookText} label="Logbook" onClick={closeMenu} />

          {(user?.role === "engineer" || user?.role === "admin") && (
            <SidebarLink to="/equipment-insights" icon={BarChart3} label="Equipment Insights" onClick={closeMenu} />
          )}
          <SidebarLink to="/forecast" icon={TrendingUp} label="Forecast" onClick={closeMenu} />

          {user?.role === "admin" && (
            <>
              <div className="section-label" style={{ margin: "10px 0 6px", fontSize: 11, color: "var(--muted)" }}>
                Admin
              </div>
              <SidebarLink to="/admin/users" icon={UserCog} label="Users" onClick={closeMenu} />
            </>
          )}
        </nav>

        <footer style={{ marginTop: "auto", fontSize: 11, color: "var(--muted)" }}>
          © {new Date().getFullYear()} PowerPulse
        </footer>
      </aside>

      {/* Backdrop for mobile */}
      <div className={`sidebar-backdrop ${open ? "show" : ""}`} onClick={() => setOpen(false)} />

      {/* Header */}
      <header className="header">
        {/* Mobile menu button (hidden on desktop) */}
        <button className="btn icon menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={18} />
        </button>

        <div className="brand" style={{ fontSize: 14 }}>
          PPMS – The Maintenance Hawkeye
        </div>

        <div className="right muted text-xs">
          {user ? (
            <>
              Signed in as <b>{user.name || user.email}</b> · {(user.role || "").toUpperCase()}
              <button className="btn" style={{ marginLeft: 10 }} onClick={handleLogout}>
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : ("Not signed in")}
        </div>
      </header>

      {/* Main */}
      <main className="main">{children}</main>
    </div>
  );
}
