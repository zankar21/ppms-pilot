// client/src/pages/Forecast.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

function ForecastTable() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["forecast", "inventory"],
    queryFn: async () =>
      (await api.get("/api/forecast/inventory?days=365&alpha=0.35&service=0.95&lead=7&review=7")).data,
    staleTime: 60_000,
  });

  if (isLoading) return <div className="card">Computing forecast…</div>;
  if (isError)   return <div className="card" style={{ color: "#ef4444" }}>Failed: {String(error)}</div>;

  const rows = data?.rows || [];

  return (
    <div className="card">
      <div className="badge">Inventory Forecast (90–365d)</div>

      {/* ✅ use your responsive table wrapper */}
      <div className="table-responsive" style={{ marginTop: 10 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>On hand</th>
              <th>Avg/day</th>
              <th>Smoothed/day</th>
              <th>σ</th>
              <th>Lead (d)</th>
              <th>Safety</th>
              <th>ROP</th>
              <th>Reorder</th>
              <th>Run-out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const urgent = r.onHand < r.reorderPoint;
              return (
                <tr
                  key={r.itemId}
                  /* subtle highlight for below-ROP rows */
                  style={urgent ? { background: "rgba(239,68,68,.10)" } : undefined}
                >
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name || r.code || r.itemId}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{r.code}</div>
                  </td>
                  <td>{r.onHand}</td>
                  <td>{r.avgDaily}</td>
                  <td>{r.smoothedDaily}</td>
                  <td>{r.sd}</td>
                  <td>{r.leadTimeDays}</td>
                  <td>{r.safetyStock}</td>
                  <td>{r.reorderPoint}</td>
                  <td><b>{r.reorderQty}</b></td>
                  <td>{r.runoutDate ? new Date(r.runoutDate).toLocaleDateString() : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!rows.length && <div className="muted" style={{ padding: 12 }}>No usage in the selected window.</div>}
    </div>
  );
}

export default function ForecastPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold">Forecast</h1>
      <p className="muted" style={{ marginBottom: 12 }}>
        Reorder point (ROP) = demand during lead time + safety stock. Items below ROP are highlighted.
      </p>
      <ForecastTable />
    </div>
  );
}
