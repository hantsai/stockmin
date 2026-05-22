// api/sectors.js — 分批抓取，避免一次太多超時
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { tickers } = req.query;
  if (!tickers) return res.status(400).json({ error: "tickers required" });

  const tickerList = tickers.split(",").filter(Boolean).slice(0, 80);

  const fetchOne = async (ticker) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d&_=${Date.now()}`;
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) return null;
      const json = await r.json();
      const meta = json.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const prev = meta.previousClose ?? meta.chartPreviousClose;
      const now  = meta.regularMarketPrice;
      if (!prev || !now) return null;
      return {
        ticker,
        price:    +now.toFixed(2),
        change:   +(now - prev).toFixed(2),
        pct:      +(((now - prev) / prev) * 100).toFixed(2),
        volume:   meta.regularMarketVolume ?? 0,
        currency: meta.currency ?? (ticker.includes(".TW") ? "TWD" : "USD"),
      };
    } catch { return null; }
  };

  // 分批處理，每批10支，批次間稍作間隔
  const BATCH = 10;
  const data = {};
  for (let i = 0; i < tickerList.length; i += BATCH) {
    const batch = tickerList.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(fetchOne));
    results.forEach((d, j) => { if (d) data[batch[j]] = d; });
    // 批次間等100ms，避免Yahoo限流
    if (i + BATCH < tickerList.length) await new Promise(r => setTimeout(r, 100));
  }

  res.status(200).json({ data });
}
