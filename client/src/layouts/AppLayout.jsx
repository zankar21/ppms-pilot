import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Boxes, Wrench, NotebookText, ShieldCheck,
  LogOut, UserCog, TrendingUp, BarChart3,
} from "lucide-react";

function SidebarLink({ to, icon: Icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => "btn tab" + (isActive ? " active" : "")}>
      {Icon && <Icon size={16} />}
      {label}
    </NavLink>
  );
}

export default function AppLayout({ children }) {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("ppms_user") || "null"); }
    catch { return null; }
  })();
  const isEngOrAdmin = user?.role === "engineer" || user?.role === "admin";

  function handleLogout() {
    localStorage.removeItem("ppms_jwt");
    localStorage.removeItem("ppms_user");
    window.location.href = "/login";
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge"><ShieldCheck size={16} color="white" /></div>
          PPMS
        </div>

        <nav className="tabs" style={{ marginTop: 20, flexDirection: "column" }}>
          <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" />
          <SidebarLink to="/inventory" icon={Boxes} label="Inventory" />
          <SidebarLink to="/maintenance" icon={Wrench} label="Maintenance" />
          <SidebarLink to="/logbook" icon={NotebookText} label="Logbook" />

          {isEngOrAdmin && (
            <>
              <SidebarLink to="/equipment-insights" icon={BarChart3} label="Equipment Insights" />
              <SidebarLink to="/forecast" icon={TrendingUp} label="Forecast" />
            </>
          )}

          {user?.role === "admin" && (
            <>
              <div className="section-label" style={{ margin: "10px 0 6px", fontSize: 11, color: "var(--muted)" }}>
                Admin
              </div>
              <SidebarLink to="/admin/users" icon={UserCog} label="Users" />
            </>
          )}
        </nav>

        <footer style={{ marginTop: "auto", fontSize: 11, color: "var(--muted)" }}>
          © {new Date().getFullYear()} PowerPulse
        </footer>
      </aside>

      <header className="header">
        <div className="brand" style={{ fontSize: 14 }}>PPMS – The Maintenance Hawkeye</div>
        <div className="right muted text-xs">
          {user ? (
            <>
              Signed in as <b>{user.name || user.email}</b> · {(user.role || "").toUpperCase()}
              <button className="btn" style={{ marginLeft: 10 }} onClick={handleLogout}>
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : "Not signed in"}
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );
}
