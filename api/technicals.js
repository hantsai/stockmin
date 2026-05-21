// api/technicals.js — 從 Yahoo Finance 抓歷史資料，計算 MA5/MA20/RSI14
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  try {
    // 抓60天日線資料（足夠計算 MA20 + RSI14）
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=60d`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error("Yahoo fetch failed");
    const json = await r.json();
    const result = json.chart?.result?.[0];
    if (!result) throw new Error("No data");

    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(v => v != null);
    const volumes = (result.indicators?.quote?.[0]?.volume ?? []).filter(v => v != null);
    const highs   = (result.indicators?.quote?.[0]?.high   ?? []).filter(v => v != null);
    const lows    = (result.indicators?.quote?.[0]?.low    ?? []).filter(v => v != null);

    if (closes.length < 5) throw new Error("Not enough data");

    // MA5
    const ma5 = closes.length >= 5
      ? +(closes.slice(-5).reduce((a,b)=>a+b,0)/5).toFixed(2) : null;

    // MA20
    const ma20 = closes.length >= 20
      ? +(closes.slice(-20).reduce((a,b)=>a+b,0)/20).toFixed(2) : null;

    // RSI14
    let rsi = null;
    if (closes.length >= 15) {
      const changes = closes.slice(-15).map((c,i,a) => i===0?0:c-a[i-1]).slice(1);
      const gains = changes.map(c=>c>0?c:0);
      const losses = changes.map(c=>c<0?Math.abs(c):0);
      const avgGain = gains.reduce((a,b)=>a+b,0)/14;
      const avgLoss = losses.reduce((a,b)=>a+b,0)/14;
      rsi = avgLoss===0 ? 100 : +(100-(100/(1+avgGain/avgLoss))).toFixed(1);
    }

    // 成交量趨勢（今日 vs 5日均量）
    const vol5avg = volumes.length >= 5
      ? Math.round(volumes.slice(-5).reduce((a,b)=>a+b,0)/5) : null;
    const volToday = volumes[volumes.length-1] || null;
    const volRatio = vol5avg && volToday ? +(volToday/vol5avg).toFixed(2) : null;

    // 52週高低
    const week52High = highs.length > 0 ? +Math.max(...highs).toFixed(2) : null;
    const week52Low  = lows.length  > 0 ? +Math.min(...lows).toFixed(2)  : null;

    // 趨勢判斷
    let trend = "盤整";
    if (ma5 && ma20) {
      if (ma5 > ma20 * 1.02) trend = "短線偏多";
      else if (ma5 < ma20 * 0.98) trend = "短線偏空";
    }

    res.status(200).json({
      ticker, ma5, ma20, rsi, volRatio, week52High, week52Low, trend,
      closes: closes.slice(-20).map(v=>+v.toFixed(2)),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
