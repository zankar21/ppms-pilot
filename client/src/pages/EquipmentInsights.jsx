// client/src/pages/EquipmentInsights.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

/* ---------------- Hooks ---------------- */

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
    queryFn: async () =>
      (await api.get(`/api/equipment/${id}/insights?windowDays=180&futureDays=30`)).data,
  });
}

/** Observe an element’s content box size (works on mobile WebViews). */
function useMeasure() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback for very old webviews: set an initial width
    setSize({ width: el.clientWidth || window.innerWidth, height: el.clientHeight || 0 });

    // ResizeObserver is widely supported on Android/iOS webviews now
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      // Round to integers to avoid re-renders from sub-pixel jitter
      const w = Math.max(0, Math.round(cr.width));
      const h = Math.max(0, Math.round(cr.height));
      setSize((prev) => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
}

/* ---------------- UI bits ---------------- */

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

/* ---------------- Page ---------------- */

export default function EquipmentInsightsPage() {
  const [selected, setSelected] = useState("");

  const { data: eqList, isLoading: listLoading } = useEquipmentList();
  const { data: insights, isLoading: insLoading } = useEquipmentInsights(selected);

  const rows = eqList?.rows || [];
  const metrics = insights?.metrics;
  const series = Array.isArray(insights?.series) ? insights.series : [];

  const risk = metrics?.riskScore ?? 0;
  const riskBadge = useMemo(() => {
    if (risk >= 80) return { text: "High", className: "danger" };
    if (risk >= 50) return { text: "Medium", className: "warn" };
    return { text: "Low", className: "" };
  }, [risk]);

  // Nudge layout once after load (helps some webviews initialize measurements)
  useEffect(() => {
    const id = setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
    return () => clearTimeout(id);
  }, [selected, series.length]);

  // Chart sizing driven by ResizeObserver instead of ResponsiveContainer
  const [chartRef, chartSize] = useMeasure();
  const chartHeight = 300;

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold">Equipment Insights</h1>

      <div className="flex items-center gap-2" style={{ marginTop: 10, flexWrap: "wrap" }}>
        {listLoading ? (
          <span className="muted">Loading equipment…</span>
        ) : (
          <Select value={selected} onChange={setSelected} options={rows} />
        )}
        {insLoading && selected ? <span className="muted">Loading insights…</span> : null}
        {selected && insights?.equipment && (
          <span className={`badge ${riskBadge.className}`}>
            {insights.equipment.name || insights.equipment.code} · {riskBadge.text} risk
          </span>
        )}
      </div>

      {selected && insights && (
        <>
          <div className="grid grid-4" style={{ marginTop: 12 }}>
            <KPICard
              label="Breakdowns (window)"
              value={metrics?.breakdowns}
              hint={`${insights.windowDays} days`}
            />
            <KPICard label="MTBF (days)" value={metrics?.mtbfDays} />
            <KPICard
              label="Top reason"
              value={metrics?.topReason?.text || "—"}
              hint={`count: ${metrics?.topReason?.count || 0}`}
            />
            <KPICard
              label="Next 30d failure risk"
              value={
                metrics?.nextFailure?.probability != null
                  ? `${metrics.nextFailure.probability}%`
                  : "—"
              }
            />
          </div>

          {/* ---- Chart (ResizeObserver-driven) ---- */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="badge">Breakdowns per week</div>
            <div
              ref={chartRef}
              // minWidth:0 is important in flex/grid; gives the box a measurable width
              style={{ height: chartHeight, marginTop: 8, width: "100%", minWidth: 0 }}
            >
              {series.length === 0 ? (
                <div className="muted" style={{ padding: 12 }}>
                  No breakdowns in this window.
                </div>
              ) : chartSize.width > 0 ? (
                <LineChart
                  width={chartSize.width}
                  height={chartHeight}
                  data={series.map((d) => ({ ...d, count: Number(d.count) || 0 }))}
                  margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
              ) : null}
            </div>
          </div>

          {/* ---- Actions ---- */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="badge">Recommended next actions</div>
            <ul style={{ marginTop: 10, paddingLeft: 18 }}>
              {(insights.actions || []).map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>

          {/* ---- Recent maintenance (responsive table) ---- */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="badge">Recent maintenance</div>
            <div className="table-responsive" style={{ marginTop: 8 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Downtime</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {(insights.recent || []).map((r, idx) => (
                    <tr key={idx}>
                      <td>{new Date(r.when).toLocaleString()}</td>
                      <td>{r.type}</td>
                      <td style={{ wordBreak: "break-word" }}>{r.reason || "—"}</td>
                      <td>{r.downtimeMins} min</td>
                      <td>{r.severity || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!insights.recent || insights.recent.length === 0) && (
              <div className="muted p-3">No maintenance records in the window.</div>
            )}
          </div>

          {/* ---- Recent logbook ---- */}
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
