export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const table = req.query.table;
  const query = req.query.query || "select=*";

  if (!table) {
    return res.status(400).json({ error: "Missing 'table' parameter" });
  }

  const allowed = ["sessions", "report_cache", "contracts"];
  if (!allowed.includes(table)) {
    return res.status(403).json({ error: "Table not allowed" });
  }

  const url = process.env.SUPABASE_URL + "/rest/v1/" + table + "?" + query;

  try {
    const response = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_KEY,
        Authorization: "Bearer " + process.env.SUPABASE_KEY,
      },
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Supabase returned " + response.status });
    }

    const data = await response.json();

    res.setHeader(
      "Cache-Control",
      "s-maxage=300, stale-while-revalidate=600"
    );
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Proxy fetch failed" });
  }
}
