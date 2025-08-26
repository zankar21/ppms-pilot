import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Pages
import Dashboard from "./pages/Dashboard.jsx";
import Inventory from "./pages/Inventory.jsx";
import Maintenance from "./pages/Maintenance.jsx";
import Logbook from "./pages/Logbook.jsx";
import Login from "./pages/Login.jsx";

// Components
import RouteGuard from "./components/RouteGuard.jsx";
import AppLayout from "./layouts/AppLayout.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <RouteGuard roles={["operator", "engineer", "admin"]}>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </RouteGuard>
        }
      />

      <Route
        path="/inventory"
        element={
          <RouteGuard roles={["engineer", "admin"]}>
            <AppLayout>
              <Inventory />
            </AppLayout>
          </RouteGuard>
        }
      />

      <Route
        path="/maintenance"
        element={
          <RouteGuard roles={["engineer", "admin"]}>
            <AppLayout>
              <Maintenance />
            </AppLayout>
          </RouteGuard>
        }
      />

      <Route
        path="/logbook"
        element={
          <RouteGuard roles={["operator", "engineer", "admin"]}>
            <AppLayout>
              <Logbook />
            </AppLayout>
          </RouteGuard>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
