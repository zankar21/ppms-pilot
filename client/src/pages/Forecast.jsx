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
  if (isError) return <div className="card text-red-500">Failed: {String(error)}</div>;

  const rows = data?.rows || [];
  return (
    <div className="card">
      <div className="badge">Inventory Forecast (90–365d)</div>
      <div className="overflow-x-auto" style={{ marginTop: 10 }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Item</th>
              <th className="p-2">On hand</th>
              <th className="p-2">Avg/day</th>
              <th className="p-2">Smoothed/day</th>
              <th className="p-2">σ</th>
              <th className="p-2">Lead (d)</th>
              <th className="p-2">Safety</th>
              <th className="p-2">ROP</th>
              <th className="p-2">Reorder</th>
              <th className="p-2">Run-out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const urgent = r.onHand < r.reorderPoint;
              return (
                <tr key={r.itemId} className={urgent ? "bg-red-50 dark:bg-red-900/20" : ""}>
                  <td className="p-2">
                    <div className="font-medium">{r.name || r.code || r.itemId}</div>
                    <div className="text-xs text-slate-500">{r.code}</div>
                  </td>
                  <td className="p-2">{r.onHand}</td>
                  <td className="p-2">{r.avgDaily}</td>
                  <td className="p-2">{r.smoothedDaily}</td>
                  <td className="p-2">{r.sd}</td>
                  <td className="p-2">{r.leadTimeDays}</td>
                  <td className="p-2">{r.safetyStock}</td>
                  <td className="p-2">{r.reorderPoint}</td>
                  <td className="p-2"><b>{r.reorderQty}</b></td>
                  <td className="p-2">{r.runoutDate ? new Date(r.runoutDate).toLocaleDateString() : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <div className="muted p-3">No usage in the selected window.</div>}
      </div>
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
