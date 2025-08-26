// client/src/components/KpiTile.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api"; // adjust if your api path differs

/**
 * Props:
 * - title: string (label)
 * - value: string|number (display value)
 * - tag: string (telemetry tag to check anomalies for)
 * - helpText?: string (optional small caption)
 */
export default function KpiTile({ title, value, tag, helpText }) {
  const { data } = useQuery({
    queryKey: ["anom-count", tag],
    queryFn: async () =>
      (await api.get(`/anomaly/counts?hours=24&tags=${encodeURIComponent(tag || "")}`)).data,
    enabled: Boolean(tag),
    refetchInterval: 60_000, // refresh every 60s
    refetchOnWindowFocus: false,
  });

  // Find the row for this tag (API returns array of { tag, anomalies, total })
  const count =
    data?.rows?.find?.((r) => r.tag === tag)?.anomalies ??
    (Array.isArray(data?.rows) && data.rows.length === 1 ? data.rows[0].anomalies : 0);

  return (
    <div className="card relative p-4">
      {/* Badge */}
      {count > 0 && (
        <span
          className="absolute -top-2 -right-2 inline-flex items-center justify-center
                     h-6 min-w-[1.5rem] px-2 rounded-full text-xs font-semibold
                     bg-red-500/80 text-white shadow-lg"
          title={`${count} anomalies in last 24h`}
        >
          {count}
        </span>
      )}

      {/* Content */}
      <div className="text-slate-400 text-xs">{title}</div>
      <div className="text-2xl font-semibold leading-tight">{value ?? "—"}</div>
      {helpText ? <div className="text-[11px] text-slate-500 mt-1">{helpText}</div> : null}
    </div>
  );
}
