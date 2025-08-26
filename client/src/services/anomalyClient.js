import { api } from './api';

/**
 * Fetch a z-score for a telemetry tag.
 */
export async function getZScore({ tag, unit, department, hours = 168 }) {
  const params = new URLSearchParams({ tag, hours });
  if (unit) params.set('unit', unit);
  if (department) params.set('department', department);
  const { data } = await api.get(`/anomaly/zscore?${params.toString()}`);
  return data;
}
