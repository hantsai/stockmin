// api/sectors.js — 批次抓多支股票報價，供類股分析使用
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { tickers } = req.query;
  if (!tickers) return res.status(400).json({ error: "tickers required" });

  const tickerList = tickers.split(",").filter(Boolean).slice(0, 50);

  const fetchOne = async (ticker) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d&_=${Date.now()}`;
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(7000),
      });
      if (!r.ok) return null;
      const json = await r.json();
      const meta = json.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const prev = meta.previousClose ?? meta.chartPreviousClose;
      const now  = meta.regularMarketPrice;
      return {
        ticker,
        price:  +now.toFixed(2),
        change: +(now - prev).toFixed(2),
        pct:    +(((now - prev) / prev) * 100).toFixed(2),
        volume: meta.regularMarketVolume ?? 0,
        currency: meta.currency ?? (ticker.includes(".TW") ? "TWD" : "USD"),
      };
    } catch { return null; }
  };

  // 批次平行抓取
  const results = await Promise.all(tickerList.map(fetchOne));
  const data = {};
  results.forEach((d, i) => { if (d) data[tickerList[i]] = d; });

  res.status(200).json({ data });
}
