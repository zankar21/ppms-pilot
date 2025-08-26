import React, { useRef, useState, useMemo } from "react";
import { api } from "../services/api";
import { getUser } from "../services/auth";

const TEMPLATES = {
  inventory: ["itemId,qty,txn_dt,type,unit,dept,notes",
              "BRG-6205,-2,2025-07-03 09:00,CONSUME,UNIT-1,MECH,Line-2 change",
              "OIL-68,10,2025-07-04 12:00,RECEIPT,UNIT-1,MECH,Supplier GRN 118"].join("\n"),
  maintenance: ["equipmentId,type,reason,createdAt,downtimeMins,severity,unit,dept",
                "PUMP-03,BD,Bearing overheating,2025-06-21 10:20,45,3,UNIT-1,MECH",
                "PUMP-03,PM,Monthly lubrication,2025-06-25 09:00,0,1,UNIT-1,MECH"].join("\n"),
  logbook: ["equipmentId,text,createdAt,severity,unit,dept",
            "PUMP-03,Vibration slightly high,2025-06-20 08:15,2,UNIT-1,MECH",
            ",General shift notes,2025-06-20 16:00,0,UNIT-2,ELEC"].join("\n"),
};

function download(name, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function UploadDataDialog({ kind, label = "Upload CSV/Excel", onDone }) {
  const me = getUser();
  const canUpload = useMemo(() => {
    if (!me) return false;
    if (me.role === "admin" || me.role === "engineer") return true;
    // operator can upload ONLY logbook
    return me.role === "operator" && kind === "logbook";
  }, [me, kind]);

  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  if (!canUpload) return null;

  function chooseFile() {
    setError(""); setResult(null);
    inputRef.current?.click();
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post(`/api/upload/${kind}`, fd);
      setResult(data?.summary);
      onDone?.(data?.summary);
      // Persist a tiny badge in session (optional)
      sessionStorage.setItem(`lastImport:${kind}`, JSON.stringify({
        at: new Date().toISOString(),
        inserted: data?.summary?.inserted ?? 0,
        total: data?.summary?.total ?? 0
      }));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = ""; // reset chooser
    }
  }

  const lastBadge = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(`lastImport:${kind}`) || "null"); }
    catch { return null; }
  }, [result, kind]);

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
        <button className="btn" onClick={chooseFile} disabled={busy}>
          {busy ? "Uploading…" : label}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          onChange={onFile}
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="btn"
          onClick={() => download(`${kind}_template.csv`, TEMPLATES[kind])}
        >
          Download template
        </button>

        {lastBadge && (
          <span className="badge" title={new Date(lastBadge.at).toLocaleString()}>
            Last import: {lastBadge.inserted}/{lastBadge.total}
          </span>
        )}

        <span className="muted text-xs">
          Accepts .csv/.xlsx. Extra columns are ignored; known headers auto-mapped.
        </span>
      </div>

      {error && <div className="text-red-500 text-sm" style={{ marginTop: 8 }}>{error}</div>}

      {result && (
        <div className="muted text-sm" style={{ marginTop: 8 }}>
          <div><b>Imported:</b> {result.inserted} / {result.total} rows</div>
          <div><b>Skipped:</b> {result.skipped}</div>

          {!!(result.warnings?.length) && (
            <div style={{ marginTop: 6 }}>
              <div className="badge">Warnings</div>
              <ul className="text-xs">
                {result.warnings.slice(0, 5).map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}

          {!!(result.previewColumns?.length) && (
            <div style={{ marginTop: 6 }}>
              <div className="badge">Detected headers</div>
              <div className="text-xs">{result.previewColumns.join(" · ")}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
