import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

/**
 * Props:
 * - unit, setUnit
 * - dept, setDept
 * - persistToUrl?: boolean (default true) — keeps ?unit=&dept= in URL
 */
export default function Filters({ unit, setUnit, dept, setDept, persistToUrl = true }) {
  const [units, setUnits] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // On mount: fetch masters
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErr("");

    Promise.all([
      api.get("/api/masters/units"),
      api.get("/api/masters/departments"),
    ])
      .then(([uRes, dRes]) => {
        if (!isMounted) return;
        setUnits(uRes.data?.rows || []);
        setDepts(dRes.data?.rows || []);
      })
      .catch((e) => {
        if (!isMounted) return;
        setErr(e?.userMessage || e?.message || "Failed to load filters");
      })
      .finally(() => isMounted && setLoading(false));

    return () => { isMounted = false; };
  }, []);

  // Optional: persist to URL (?unit=&dept=)
  useEffect(() => {
    if (!persistToUrl) return;
    const url = new URL(window.location.href);
    if (unit) url.searchParams.set("unit", unit); else url.searchParams.delete("unit");
    if (dept) url.searchParams.set("dept", dept); else url.searchParams.delete("dept");
    // Don’t create history entries for every change:
    window.history.replaceState({}, "", url.toString());
  }, [unit, dept, persistToUrl]);

  // Initialize from URL on first render (if provided)
  useEffect(() => {
    if (!persistToUrl) return;
    const url = new URL(window.location.href);
    const initUnit = url.searchParams.get("unit") || "";
    const initDept = url.searchParams.get("dept") || "";
    // only set if parent hasn’t already set values
    if (!unit && initUnit) setUnit(initUnit);
    if (!dept && initDept) setDept(initDept);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistToUrl]);

  const unitOptions = useMemo(
    () => units.map((u) => ({ value: u.code, label: `${u.code} — ${u.name || u.code}` })),
    [units]
  );
  const deptOptions = useMemo(
    () => depts.map((d) => ({ value: d.code, label: `${d.code} — ${d.name || d.code}` })),
    [depts]
  );

  function resetFilters() {
    setUnit("");
    setDept("");
  }

  return (
    <div className="row" style={{ marginBottom: 10 }}>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <select
          className="select"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          aria-label="Filter by unit"
          disabled={loading}
          style={{ minWidth: 220 }}
        >
          <option value="">{loading ? "Loading units…" : "All Units"}</option>
          {unitOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          className="select"
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          aria-label="Filter by department"
          disabled={loading}
          style={{ minWidth: 240 }}
        >
          <option value="">{loading ? "Loading departments…" : "All Departments"}</option>
          {deptOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button className="btn" onClick={resetFilters} disabled={loading} title="Clear filters">
          Reset
        </button>
      </div>

      {err ? (
        <div className="muted" style={{ color: "var(--danger)" }}>
          {err}
        </div>
      ) : null}
    </div>
  );
}
