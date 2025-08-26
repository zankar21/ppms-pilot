import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function useEquipmentList() {
  return useQuery({
    queryKey: ["equipment-list"],
    queryFn: async () => (await api.get("/api/equipment")).data,
    staleTime: 5 * 60_000,
  });
}

function useEquipmentInsights(id) {
  return useQuery({
    queryKey: ["equipment-insights", id],
    enabled: !!id,
    queryFn: async () => (await api.get(`/api/equipment/${id}/insights?windowDays=180&futureDays=30`)).data,
  });
}

function Select({ value, onChange, options }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select equipment…</option>
      {options.map((o) => (
        <option key={o._id} value={o._id}>
          {o.name || o.code || o._id} {o.code ? `(${o.code})` : ""}
        </option>
      ))}
    </select>
  );
}

function KPICard({ label, value, hint }) {
  return (
    <div className="card kpi">
      <div className="label">{label}</div>
      <div className="value">{value ?? "—"}</div>
      {hint && <div className="label" style={{ marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export default function EquipmentInsightsPage() {
  const [selected, setSelected] = useState("");
  const { data: eqList, isLoading: listLoading } = useEquipmentList();
  const { data: insights, isLoading: insLoading } = useEquipmentInsights(selected);

  const rows = eqList?.rows || [];
  const metrics = insights?.metrics;

  const risk = metrics?.riskScore ?? 0;
  const riskBadge = useMemo(() => {
    if (risk >= 80) return { text: "High", className: "badge danger" };
    if (risk >= 50) return { text: "Medium", className: "badge warn" };
    return { text: "Low", className: "badge" };
  }, [risk]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold">Equipment Insights</h1>
      <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
        {listLoading ? <span className="muted">Loading equipment…</span> :
          <Select value={selected} onChange={setSelected} options={rows} />}
        {insLoading && selected ? <span className="muted">Loading insights…</span> : null}
        {selected && insights?.equipment && (
          <span className={`badge ${riskBadge.className}`}>{insights.equipment.name || insights.equipment.code} · {riskBadge.text} risk</span>
        )}
      </div>

      {selected && insights && (
        <>
          <div className="grid grid-4" style={{ marginTop: 12 }}>
            <KPICard label="Breakdowns (window)" value={metrics?.breakdowns} hint={`${insights.windowDays} days`} />
            <KPICard label="MTBF (days)" value={metrics?.mtbfDays} />
            <KPICard label="Top reason" value={metrics?.topReason?.text || "—"} hint={`count: ${metrics?.topReason?.count || 0}`} />
            <KPICard label="Next 30d failure risk" value={metrics?.nextFailure?.probability != null ? `${metrics.nextFailure.probability}%` : "—"} />
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="badge">Breakdowns per week</div>
            <div style={{ height: 300, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={insights.series || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="badge">Recommended next actions</div>
            <ul style={{ marginTop: 10, paddingLeft: 18 }}>
              {(insights.actions || []).map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="badge">Recent maintenance</div>
            <div className="overflow-x-auto" style={{ marginTop: 8 }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">When</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Reason</th>
                    <th className="p-2">Downtime</th>
                    <th className="p-2">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {(insights.recent || []).map((r, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{new Date(r.when).toLocaleString()}</td>
                      <td className="p-2">{r.type}</td>
                      <td className="p-2">{r.reason || "—"}</td>
                      <td className="p-2">{r.downtimeMins} min</td>
                      <td className="p-2">{r.severity || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!insights.recent || insights.recent.length === 0) && (
                <div className="muted p-3">No maintenance records in the window.</div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="badge">Recent logbook notes</div>
            <ul style={{ marginTop: 8 }}>
              {(insights.logs || []).slice(0, 10).map((l, i) => (
                <li key={i} className="border-t p-2">
                  <div className="text-xs muted">{new Date(l.createdAt).toLocaleString()}</div>
                  <div>{l.text || l.remarks || "—"}</div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
