/**
 * Fetch data from Supabase via the server-side proxy.
 * Usage: const rows = await supabaseFetch("report_cache", "report=eq.orb&symbol=eq.NQ&limit=1");
 */
export async function supabaseFetch(table, query = "select=*") {
  const params = new URLSearchParams({ table, query });
  const res = await fetch(`/api/supabase?${params}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

/**
 * Stringify filters with sorted keys to match Python's json.dumps(sort_keys=True).
 * Python uses ", " and ": " separators by default, JS uses "," and ":"
 * so we must add spaces to match exactly.
 */
function sortedJsonStringify(obj) {
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => {
    const v = obj[k] === null ? "null" : JSON.stringify(obj[k]);
    return `"${k}": ${v}`;
  });
  return `{${pairs.join(", ")}}`;
}

/**
 * Fetch a specific report from report_cache.
 */
export async function fetchReport(report, symbol, filters, lookbackDays) {
  const filtersJson = sortedJsonStringify(filters);
  const query = [
    "select=*",
    `report=eq.${report}`,
    `symbol=eq.${symbol}`,
    `lookback_days=eq.${lookbackDays}`,
    `filters_json=eq.${filtersJson}`,
    "limit=1",
  ].join("&");

  const rows = await supabaseFetch("report_cache", query);

  if (!rows || rows.length === 0) return null;

  const row = rows[0];
  const stats =
    typeof row.stats_json === "string"
      ? JSON.parse(row.stats_json)
      : row.stats_json;

  return {
    ...stats,
    sample_size: row.sample_size,
    total_sessions: row.total_sessions,
    computed_at: row.computed_at,
  };
}

/**
 * Fetch overview stats for the landing page — one call per report/symbol combo.
 */
export async function fetchOverview(symbol, lookbackDays = 90) {
  const reports = [
    {
      report: "orb",
      filters: { day_of_week: null, or_period: 15 },
    },
    {
      report: "gap_fill",
      filters: { day_of_week: null, direction: null },
    },
    {
      report: "ib",
      filters: { day_of_week: null, ib_size: null },
    },
    {
      report: "prior_day_levels",
      filters: { day_of_week: null, level: null },
    },
  ];

  const results = {};
  for (const { report, filters } of reports) {
    try {
      results[report] = await fetchReport(report, symbol, filters, lookbackDays);
    } catch {
      results[report] = null;
    }
  }
  return results;
}
