// api/market.js — 抓台灣證交所當日成交量前20大
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { exclude } = req.query; // 逗號分隔的排除清單
  const excludeList = exclude ? exclude.split(",") : [];

  try {
    // 抓證交所當日成交量排行
    const r = await fetch("https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX20", {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error("TWSE fetch failed");
    const data = await r.json();

    // 過濾排除清單，取前20
    const tickers = data
      .map(d => `${d.Code}.TW`)
      .filter(t => !excludeList.includes(t))
      .slice(0, 20);

    res.status(200).json({ tickers });
  } catch (e) {
    // fallback: 固定熱門台股
    const fallback = [
      "2330.TW","2454.TW","2317.TW","3711.TW","2308.TW",
      "2303.TW","2882.TW","2881.TW","2886.TW","2891.TW",
      "2357.TW","2382.TW","6285.TW","2301.TW","2327.TW",
      "2376.TW","3008.TW","2344.TW","2603.TW","2412.TW",
    ].filter(t => !excludeList.includes(t)).slice(0, 20);
    res.status(200).json({ tickers: fallback, fallback: true });
  }
}
