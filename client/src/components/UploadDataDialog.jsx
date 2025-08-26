import React, { useRef, useState } from "react";
import { api } from "../services/api";

export default function UploadDataDialog({ kind, label = "Upload CSV/Excel", onDone }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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
      const { data } = await api.post(`/api/upload/${kind}`, fd, {
        headers: { /* let browser set multipart boundary */ },
      });
      setResult(data?.summary);
      onDone?.(data?.summary);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = ""; // reset chooser
    }
  }

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div className="flex items-center gap-2">
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
        <span className="muted text-xs">
          Accepts .csv/.xlsx. Extra columns are ignored; known columns are auto-mapped.
        </span>
      </div>

      {error && <div className="text-red-500 text-sm" style={{ marginTop: 8 }}>{error}</div>}

      {result && (
        <div className="muted text-sm" style={{ marginTop: 8 }}>
          <div><b>Imported:</b> {result.inserted} / {result.total} rows</div>
          <div><b>Skipped:</b> {result.skipped}</div>
          {!!(result.previewColumns?.length) && (
            <div style={{ marginTop: 6 }}>
              <div className="badge">Detected headers</div>
              <div className="text-xs">{result.previewColumns.join(" · ")}</div>
            </div>
          )}
          {!!(result.errors?.length) && (
            <div style={{ marginTop: 6 }}>
              <div className="badge">Errors (sample)</div>
              <ul className="text-xs">
                {result.errors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
