// client/src/components/RouteGuard.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { getUser } from "../services/auth";

/**
 * Usage:
 * <Route path="/maintenance" element={
 *   <RouteGuard roles={['engineer','admin']}>
 *     <MaintenancePage />
 *   </RouteGuard>
 * } />
 */
export default function RouteGuard({ roles = [], children }) {
  const user = getUser();

  if (!user) return <Navigate to="/login" replace />;

  if (roles.length && !roles.includes(user.role) && user.role !== "admin") {
    return <div className="p-6 text-red-400">No access</div>;
  }

  return children;
}
