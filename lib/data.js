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
 * Check if two filter objects are equal (handles nulls).
 */
function filtersMatch(stored, requested) {
  const storedObj =
    typeof stored === "string" ? JSON.parse(stored) : stored;
  const reqKeys = Object.keys(requested).sort();
  const storedKeys = Object.keys(storedObj).sort();
  if (reqKeys.length !== storedKeys.length) return false;
  for (const key of reqKeys) {
    if (storedObj[key] !== requested[key]) return false;
  }
  return true;
}

/**
 * Parse a row from report_cache into a usable stats object.
 */
function parseRow(row) {
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
 * Fetch a specific report from report_cache.
 *
 * Fetches all rows matching report/symbol/lookback, then matches
 * filters_json client-side to avoid JSONB string formatting issues.
 */
export async function fetchReport(report, symbol, filters, lookbackDays) {
  const query = [
    "select=*",
    `report=eq.${report}`,
    `symbol=eq.${symbol}`,
    `lookback_days=eq.${lookbackDays}`,
  ].join("&");

  const rows = await supabaseFetch("report_cache", query);

  if (!rows || rows.length === 0) return null;

  // Match filters client-side
  const match = rows.find((row) => filtersMatch(row.filters_json, filters));

  if (!match) return null;

  return parseRow(match);
}

/**
 * Fetch overview stats for the landing page.
 */
export async function fetchOverview(symbol, lookbackDays = 90) {
  // Fetch all reports for this symbol/lookback in one batch
  const query = [
    "select=*",
    `symbol=eq.${symbol}`,
    `lookback_days=eq.${lookbackDays}`,
  ].join("&");

  let rows;
  try {
    rows = await supabaseFetch("report_cache", query);
  } catch {
    return {};
  }

  if (!rows || rows.length === 0) return {};

  const reportConfigs = [
    { report: "orb", filters: { day_of_week: null, or_period: 15 } },
    { report: "gap_fill", filters: { day_of_week: null, direction: null } },
    { report: "ib", filters: { day_of_week: null, ib_size: null } },
    { report: "prior_day_levels", filters: { day_of_week: null, level: null } },
  ];

  const results = {};
  for (const { report, filters } of reportConfigs) {
    const match = rows.find(
      (row) => row.report === report && filtersMatch(row.filters_json, filters)
    );
    results[report] = match ? parseRow(match) : null;
  }

  return results;
}
