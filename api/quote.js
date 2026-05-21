// api/quote.js — Vercel Serverless Function
// Proxies Yahoo Finance to avoid CORS issues on the client

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=5m&range=1d&includePrePost=false`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return res.status(response.status).json({ error: "Yahoo fetch failed" });

    const json = await response.json();
    const r    = json.chart?.result?.[0];
    if (!r) return res.status(404).json({ error: "No data" });

    const meta   = r.meta;
    const prev   = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPreviousClose;
    const now    = meta.regularMarketPrice;
    const closes = (r.indicators?.quote?.[0]?.close ?? []).filter(Boolean);
    const spark  = closes.length > 4
      ? [...closes.slice(-23).map(v => ({ v: +v.toFixed(2) })), { v: now }]
      : null;

    res.status(200).json({
      ticker,
      name:      meta.longName || meta.shortName || ticker,
      price:     +now.toFixed(2),
      prevClose: +prev.toFixed(2),
      change:    +(now - prev).toFixed(2),
      pct:       +(((now - prev) / prev) * 100).toFixed(2),
      low:       +(meta.regularMarketDayLow  ?? now * 0.98).toFixed(2),
      high:      +(meta.regularMarketDayHigh ?? now * 1.02).toFixed(2),
      currency:  meta.currency ?? (ticker.includes(".TW") ? "TWD" : "USD"),
      sparkline: spark,
      real:      true,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
