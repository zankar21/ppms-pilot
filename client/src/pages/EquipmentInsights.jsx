import React, { useMemo, useState, useRef, useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

/* ---------------- data hooks ---------------- */
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

/* ---------------- bullet-proof size hook ---------------- */
function useBulletproofSize(deps = []) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId = 0;
    let tries = 0;

    const compute = () => {
      let w = el.clientWidth || Math.round(el.getBoundingClientRect().width || 0);
      if (!w && el.parentElement) {
        const p = el.parentElement;
        w = p.clientWidth || Math.round(p.getBoundingClientRect().width || 0);
      }
      // ultimate fallback: viewport width minus some padding
      if (!w && typeof window !== "undefined") {
        w = Math.max(320, Math.round((window.innerWidth || 0) - 48));
      }
      const h = el.clientHeight || 0;
      return { w, h };
    };

    const measure = () => {
      const { w, h } = compute();
      setSize((prev) => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev));

      // If element/parents still report 0, retry a few frames
      if (w <= 0 && tries < 10) {
        tries += 1;
        rafId = requestAnimationFrame(measure);
      }
    };

    measure();

    const ro = new ResizeObserver(() => {
      tries = 0;
      measure();
    });
    ro.observe(el);

    const onResize = () => {
      tries = 0;
      measure();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [ref, size];
}

/* ---------------- small UI ---------------- */
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

/* ---------------- page ---------------- */
export default function EquipmentInsightsPage() {
  const [selected, setSelected] = useState("");
  const { data: eqList, isLoading: listLoading } = useEquipmentList();
  const { data: insights, isLoading: insLoading } = useEquipmentInsights(selected);

  const rows = eqList?.rows || [];
  const metrics = insights?.metrics;

  const seriesRaw = Array.isArray(insights?.series) ? insights.series : [];
  const series = seriesRaw.map((d) => ({ ...d, count: Number(d.count) || 0 }));

  const risk = metrics?.riskScore ?? 0;
  const riskBadge = useMemo(() => {
    if (risk >= 80) return { text: "High", className: "danger" };
    if (risk >= 50) return { text: "Medium", className: "warn" };
    return { text: "Low", className: "" };
  }, [risk]);

  // Re-measure when the chart appears or the selection/insights change
  const [hostRef, hostSize] = useBulletproofSize([selected, insights?.series?.length]);
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
            <KPICard label="Breakdowns (window)" value={metrics?.breakdowns} hint={`${insights.windowDays} days`} />
            <KPICard label="MTBF (days)" value={metrics?.mtbfDays} />
            <KPICard label="Top reason" value={metrics?.topReason?.text || "—"} hint={`count: ${metrics?.topReason?.count || 0}`} />
            <KPICard
              label="Next 30d failure risk"
              value={metrics?.nextFailure?.probability != null ? `${metrics.nextFailure.probability}%` : "—"}
            />
          </div>

          {/* Chart card */}
          <div className="card" style={{ marginTop: 14, minWidth: 0 }}>
            <div className="badge">Breakdowns per week</div>

            <div
              ref={hostRef}
              style={{
                width: "100%",
                minWidth: 0,
                height: chartHeight,
                marginTop: 8,
              }}
            >
              {series.length === 0 ? (
                <div className="muted" style={{ padding: 12 }}>No breakdowns in this window.</div>
              ) : (
                <LineChart
                  // width fallback is guaranteed >= 320 now
                  width={hostSize.width || 320}
                  height={chartHeight}
                  data={series}
                  margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
              )}
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
            <div className="table-responsive" style={{ marginTop: 8 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th><th>Type</th><th>Reason</th><th>Downtime</th><th>Severity</th>
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
