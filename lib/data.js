export async function supabaseFetch(table, query = "select=*") {
  const params = new URLSearchParams({ table, query });
  const res = await fetch(`/api/supabase?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function filtersMatch(stored, requested) {
  const obj = typeof stored === "string" ? JSON.parse(stored) : stored;
  const rk = Object.keys(requested).sort();
  const sk = Object.keys(obj).sort();
  if (rk.length !== sk.length) return false;
  for (const k of rk) { if (obj[k] !== requested[k]) return false; }
  return true;
}

function parseRow(row) {
  const stats = typeof row.stats_json === "string" ? JSON.parse(row.stats_json) : row.stats_json;
  return { ...stats, sample_size: row.sample_size, total_sessions: row.total_sessions, computed_at: row.computed_at };
}

export async function fetchReport(report, symbol, filters, lookbackDays, sessionType = "ny") {
  const query = [
    "select=*",
    `report=eq.${report}`,
    `symbol=eq.${symbol}`,
    `lookback_days=eq.${lookbackDays}`,
    `session_type=eq.${sessionType}`,
  ].join("&");
  const rows = await supabaseFetch("report_cache", query);
  if (!rows || rows.length === 0) return null;
  const match = rows.find((r) => filtersMatch(r.filters_json, filters));
  return match ? parseRow(match) : null;
}

export async function fetchOverview(symbol, lookbackDays = 90, sessionType = "ny") {
  const query = ["select=*", `symbol=eq.${symbol}`, `lookback_days=eq.${lookbackDays}`, `session_type=eq.${sessionType}`].join("&");
  let rows;
  try { rows = await supabaseFetch("report_cache", query); } catch { return {}; }
  if (!rows || rows.length === 0) return {};
  const configs = [
    { report: "orb", filters: { day_of_week: null, or_period: 15 } },
    { report: "gap_fill", filters: { day_of_week: null, direction: null } },
    { report: "ib", filters: { day_of_week: null, ib_size: null } },
    { report: "prior_day_levels", filters: { day_of_week: null, level: null } },
  ];
  const results = {};
  for (const { report, filters } of configs) {
    const m = rows.find((r) => r.report === report && filtersMatch(r.filters_json, filters));
    results[report] = m ? parseRow(m) : null;
  }
  return results;
}
