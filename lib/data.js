/**
 * Fetch data from Supabase via the server-side proxy.
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
 * Fetch a specific report from report_cache.
 *
 * Uses Supabase's JSONB containment operator (cs = @>) to match
 * filters_json regardless of spacing or key order differences
 * between Python and JavaScript JSON serialization.
 */
export async function fetchReport(report, symbol, filters, lookbackDays) {
  const filtersJson = JSON.stringify(filters);
  const query = [
    "select=*",
    `report=eq.${report}`,
    `symbol=eq.${symbol}`,
    `lookback_days=eq.${lookbackDays}`,
    `filters_json=cs.${filtersJson}`,
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
 * Fetch overview stats for the landing page.
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
