// jobs/dailyInsights.js
// Nightly summary of last 24h of logbook entries (simple AI summarizer).
import cron from 'node-cron';
import Logbook from '../models/Logbook.js';
import InsightsDaily from '../models/InsightsDaily.js';

const TZ = process.env.TZ || 'Asia/Kolkata';

/**
 * Simple heuristic summarizer if no LLM is available.
 * Groups by unit/department and surfaces top titles.
 */
function simpleSummarize(items) {
  if (!items.length) return 'No logbook updates in the last day.';
  const byU = new Map();
  const byD = new Map();
  for (const r of items) {
    byU.set(r.unit, (byU.get(r.unit) || 0) + 1);
    byD.set(r.department, (byD.get(r.department) || 0) + 1);
  }
  const topU = [...byU.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([u,c])=>`${u}(${c})`).join(', ');
  const topD = [...byD.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([d,c])=>`${d}(${c})`).join(', ');
  const bullets = items.slice(0,10).map(r => `• [${r.unit}/${r.department}] ${r.title}`).join('\n');
  return `Highlights:\nUnits hot: ${topU || '-'}\nDepts active: ${topD || '-'}\nTop notes:\n${bullets}`;
}

async function runOnce() {
  const since = new Date(Date.now() - 24*3600*1000);
  const items = await Logbook.find({ date: { $gte: since } }).sort({ date: -1 }).limit(200);
  const day = new Date().toISOString().slice(0,10);

  const summary = simpleSummarize(items);
  const stats = {
    totalEntries: items.length,
    byUnit: Object.fromEntries(Object.entries(items.reduce((acc, r) => (acc[r.unit]=(acc[r.unit]||0)+1, acc), {}))),
    byDepartment: Object.fromEntries(Object.entries(items.reduce((acc, r) => (acc[r.department]=(acc[r.department]||0)+1, acc), {}))),
  };

  await InsightsDaily.findOneAndUpdate(
    { day },
    { $set: { summary, stats } },
    { upsert: true, new: true }
  );
}

// Run every day at 00:15 Asia/Kolkata
export function scheduleDailyInsights() {
  cron.schedule('15 0 * * *', runOnce, { timezone: TZ });
}

// Also export a manual runner for immediate invocation during bootstrap
export async function generateDailyInsightsNow() {
  await runOnce();
}
