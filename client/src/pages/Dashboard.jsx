// client/src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import Filters from "../components/Filters.jsx";

// 🔹 AI additions
import AskPPMS from "../components/AskPPMS";
import InsightsCard from "../components/InsightsCard";

export default function Dashboard() {
  const [snap, setSnap] = useState(null);

  const [trend, setTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendErr, setTrendErr] = useState("");

  const [weeks, setWeeks] = useState(8);
  const [type, setType] = useState("BD");
  const [unit, setUnit] = useState("");
  const [dept, setDept] = useState("");

  // sparkline sources
  const [txns, setTxns] = useState([]);
  const [maint, setMaint] = useState([]);
  const [logs, setLogs] = useState([]);

  const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
  const daysArray = (n) => {
    const a = [];
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(t);
      d.setDate(t.getDate() - i);
      a.push(isoDate(d));
    }
    return a;
  };
  const bucketPerDay = (rows, dateGetter) => {
    const labels = daysArray(14);
    const map = new Map(labels.map((l) => [l, 0]));
    rows.forEach((r) => {
      const k = isoDate(dateGetter(r));
      if (map.has(k)) map.set(k, map.get(k) + 1);
    });
    return labels.map((l) => ({ d: l.slice(5), v: map.get(l) }));
  };

  // Snapshot KPIs
  useEffect(() => {
    api.get("/api/dashboard").then((r) => setSnap(r.data));
  }, []);

  // Trend line (breakdowns per week)
  useEffect(() => {
    let alive = true;
    setTrendLoading(true);
    setTrendErr("");
    api
      .get("/api/dashboard/trend/breakdowns", { params: { weeks, type, unit, dept } })
      .then((r) => {
        if (!alive) return;
        const { weeks: labels, counts } = r.data;
        setTrend(labels.map((w, i) => ({ name: w, count: counts[i] })));
      })
      .catch((e) => {
        if (!alive) return;
        setTrendErr(e?.userMessage || e?.message || "Failed to load trend");
      })
      .finally(() => alive && setTrendLoading(false));
    return () => {
      alive = false;
    };
  }, [weeks, type, unit, dept]);

  // Lists for sparklines
  useEffect(() => {
    const params = { unit, dept };
    api.get("/api/inventory/txns").then((r) => setTxns(r.data.rows || []));
    api.get("/api/maintenance", { params }).then((r) => setMaint(r.data.rows || []));
    api.get("/api/logbook", { params }).then((r) => setLogs(r.data.rows || []));
  }, [unit, dept]);

  const sparkTxns = useMemo(
    () => bucketPerDay(txns, (r) => r.txn_dt || r.createdAt),
    [txns]
  );
  const sparkMaint = useMemo(
    () => bucketPerDay(maint, (r) => r.createdAt),
    [maint]
  );
  const sparkLogs = useMemo(
    () => bucketPerDay(logs, (r) => r.createdAt),
    [logs]
  );

  if (!snap) return <div className="card">Loading…</div>;

  return (
    <>
      <Filters unit={unit} setUnit={setUnit} dept={dept} setDept={setDept} />

      {/* 🔹 Ask PPMS: semantic search over logbook (unit/department-aware) */}
      <div className="card" style={{ marginTop: 12 }}>
        <AskPPMS
          unit={unit}
          department={dept}
          placeholder="Ask PPMS anything (e.g., 'bearing temp high last week in UNIT-2 MECH')…"
        />
      </div>

      <div className="grid grid-4" style={{ marginTop: 12 }}>
        <KPITile label="Inventory Items" value={snap.inventory_items} hint="Total master items" />
        <KPITile label="Inventory Txns" value={snap.inventory_txns} data={sparkTxns} hint="14-day activity" />
        <KPITile label="Maintenance" value={snap.maintenance} data={sparkMaint} hint="14-day activity" />
        <KPITile label="Logbook Entries" value={snap.logbook} data={sparkLogs} hint="14-day activity" />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="badge">Breakdowns per Week</div>
          <select
            className="select"
            style={{ maxWidth: 200 }}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="BD">Type: BD (Breakdown)</option>
            <option value="PM">Type: PM</option>
            <option value="CM">Type: CM</option>
            <option value="">Type: All</option>
          </select>
          <select
            className="select"
            style={{ maxWidth: 160 }}
            value={weeks}
            onChange={(e) => setWeeks(parseInt(e.target.value))}
          >
            <option value={6}>Last 6 weeks</option>
            <option value={8}>Last 8 weeks</option>
            <option value={12}>Last 12 weeks</option>
            <option value={26}>Last 26 weeks</option>
          </select>
          {trendLoading ? <span className="muted">Loading…</span> : null}
          {trendErr ? <span className="muted" style={{ color: "var(--danger)" }}>{trendErr}</span> : null}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 🔹 AI Insights (daily auto-summary) */}
      <div className="card" style={{ marginTop: 14 }}>
        {/* pass filters into insights */}
        <InsightsCard unit={unit} department={dept} />
      </div>
    </>
  );
}

function KPITile({ label, value, data, hint }) {
  return (
    <div className="card kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="spark"></div>
      {!!data && (
        <div style={{ height: 46, marginTop: 6 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
              <Line type="monotone" dataKey="v" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {hint && <div className="label" style={{ marginTop: 6 }}>{hint}</div>}
    </div>
  );
}
