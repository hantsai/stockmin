// api/market.js — 台股市場熱門：成交量前20大，綜合量比×漲幅評分取前6
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { exclude } = req.query;
  const excludeList = exclude ? exclude.split(",") : [];

  try {
    // Step 1: 抓成交量前20大
    const r = await fetch("https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX20", {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error("TWSE fetch failed");
    const data = await r.json();

    const candidates = data
      .map(d => `${d.Code}.TW`)
      .filter(t => !excludeList.includes(t))
      .slice(0, 20);

    // Step 2: 批次抓即時報價（含漲跌幅）
    const quotesRes = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${candidates.join(",")}&_=${Date.now()}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(7000) }
    );

    let scored = candidates.map(t => ({ ticker: t, score: 0 }));

    if (quotesRes.ok) {
      const quotesData = await quotesRes.json();
      const quotes = quotesData.quoteResponse?.result || [];
      const quoteMap = {};
      quotes.forEach(q => { quoteMap[q.symbol] = q; });

      scored = candidates.map(ticker => {
        const q = quoteMap[ticker];
        if (!q) return { ticker, score: 0 };

        const pct     = q.regularMarketChangePercent ?? 0; // 漲跌幅
        const volume  = q.regularMarketVolume ?? 0;
        const avgVol  = q.averageDailyVolume3Month ?? 1;
        const volRatio = avgVol > 0 ? volume / avgVol : 1; // 量比

        // 綜合評分：量比和漲幅同向加分，方向不同打折
        let score;
        if (pct >= 0 && volRatio >= 1) {
          // 量增價漲：最強信號，滿分加乘
          score = volRatio * (1 + pct / 10);
        } else if (pct < 0 && volRatio >= 1) {
          // 量增價跌：異常但方向不佳，打五折
          score = volRatio * 0.5;
        } else {
          // 縮量：低分
          score = volRatio * 0.3;
        }

        return { ticker, score, pct, volRatio };
      });

      // 按綜合分數排序
      scored.sort((a, b) => b.score - a.score);
    }

    const tickers = scored.slice(0, 6).map(s => s.ticker);
    res.status(200).json({ tickers });

  } catch (e) {
    // fallback
    const fallback = [
      "2330.TW","2454.TW","2317.TW","3711.TW","2308.TW","2303.TW",
    ].filter(t => !excludeList.includes(t)).slice(0, 6);
    res.status(200).json({ tickers: fallback, fallback: true });
  }
}
