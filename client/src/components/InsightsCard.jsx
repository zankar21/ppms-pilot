// client/src/components/InsightsCard.jsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

function fmt(d) {
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

function Stat({ label, value }) {
  return (
    <div className="badge" title={label}>
      <b style={{ color: "var(--text)" }}>{value ?? 0}</b>&nbsp;
      <span className="muted">{label}</span>
    </div>
  );
}

export default function InsightsCard({ unit = "", department = "" }) {
  const [days, setDays] = useState(7);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["insights-daily", days, unit, department],
    // NOTE: base URL is http://localhost:5000, so include /api here:
    queryFn: async () =>
      (await api.get(`/api/insights/daily`, { params: { days, unit, department } })).data,
    refetchOnWindowFocus: false,
  });

  const summary = data?.summary;
  const totals = useMemo(() => summary?.totals || { logbook: 0, maintenance: 0 }, [summary]);

  return (
    <div className="card" style={{ padding: 16 }}>
      {/* Header */}
      <div className="row" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontWeight: 700 }}>AI Insights</h3>
        {isFetching ? <span className="muted">updating…</span> : null}
        <div className="right row">
          <select
            className="select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Insights window"
            style={{ width: 140 }}
          >
            <option value={1}>Last 1 day</option>
            <option value={3}>Last 3 days</option>
            <option value={7}>Last 7 days</option>
          </select>
          <button className="btn" onClick={() => refetch()}>Refresh</button>
        </div>
      </div>

      {/* Loading / Error / Empty */}
      {isLoading ? (
        <div className="muted">Loading insights…</div>
      ) : isError ? (
        <div className="muted" style={{ color: "var(--danger)" }}>
          Failed to load insights: {error?.userMessage || error?.message || "Unknown error"}
        </div>
      ) : !summary ? (
        <div className="muted">No insights available yet.</div>
      ) : (
        <>
          {/* Totals */}
          <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <Stat label="Window (days)" value={summary.windowDays} />
            <Stat label="Logbook entries" value={totals.logbook} />
            <Stat label="Maintenance items" value={totals.maintenance} />
            {summary.filters?.unit ? <Stat label="Unit" value={summary.filters.unit} /> : null}
            {summary.filters?.department ? (
              <Stat label="Department" value={summary.filters.department} />
            ) : null}
          </div>

          {/* Breakdowns */}
          <div className="grid grid-2" style={{ marginBottom: 12 }}>
            <div className="card">
              <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>By Department</div>
              <div>
                {(summary.byDepartment?.logbook || []).map((d) => (
                  <div key={`dept-log-${d.department || "Unknown"}`} className="row" style={{ justifyContent: "space-between", padding: "6px 0" }}>
                    <span className="badge">{d.department || "Unknown"}</span>
                    <span className="muted">Logbook: {d.count}</span>
                  </div>
                ))}
                {(summary.byDepartment?.maintenance || []).map((d) => (
                  <div key={`dept-maint-${d.department || "Unknown"}`} className="row" style={{ justifyContent: "space-between", padding: "6px 0" }}>
                    <span className="badge">{d.department || "Unknown"}</span>
                    <span className="muted">Maintenance: {d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>By Unit</div>
              <div>
                {(summary.byUnit?.logbook || []).map((d) => (
                  <div key={`unit-log-${d.unit || "Unknown"}`} className="row" style={{ justifyContent: "space-between", padding: "6px 0" }}>
                    <span className="badge">{d.unit || "Unknown"}</span>
                    <span className="muted">Logbook: {d.count}</span>
                  </div>
                ))}
                {(summary.byUnit?.maintenance || []).map((d) => (
                  <div key={`unit-maint-${d.unit || "Unknown"}`} className="row" style={{ justifyContent: "space-between", padding: "6px 0" }}>
                    <span className="badge">{d.unit || "Unknown"}</span>
                    <span className="muted">Maintenance: {d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid grid-2">
            <div className="card">
              <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>Latest Logbook</div>
              {summary.highlights?.latestLogs?.length ? (
                <div>
                  {summary.highlights.latestLogs.map((r, idx) => (
                    <div key={idx} className="row" style={{ justifyContent: "space-between", padding: "6px 0" }}>
                      <div style={{ maxWidth: "70%" }}>
                        <div>{r.message}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {r.unit ? `Unit: ${r.unit} · ` : ""}
                          {r.department ? `Dept: ${r.department} · ` : ""}
                          {r.shift ? `Shift: ${r.shift} · ` : ""}
                          {fmt(r.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">No recent logbook updates.</div>
              )}
            </div>

            <div className="card">
              <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>Upcoming Maintenance</div>
              {summary.highlights?.upcomingMaintenance?.length ? (
                <div>
                  {summary.highlights.upcomingMaintenance.map((m, idx) => (
                    <div key={idx} className="row" style={{ justifyContent: "space-between", padding: "6px 0" }}>
                      <div style={{ maxWidth: "70%" }}>
                        <div style={{ fontWeight: 600 }}>{m.title}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {m.type ? `Type: ${m.type} · ` : ""}
                          {m.unit ? `Unit: ${m.unit} · ` : ""}
                          {m.department ? `Dept: ${m.department} · ` : ""}
                          {m.plannedDate ? `Planned: ${fmt(m.plannedDate)}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">No upcoming maintenance in this window.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
