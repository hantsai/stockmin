// api/search.js — 台股名稱/代號搜尋（TWSE 全股票清單）
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q || q.length < 1) return res.status(400).json({ error: "query required" });

  try {
    // TWSE 上市股票清單
    const r = await fetch(
      "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL",
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) throw new Error("TWSE API error");
    const data = await r.json();

    const query = q.trim().toLowerCase();
    const results = data
      .filter(s => {
        if (!s.Code || !s.Name) return false;
        // 過濾掉非股票（ETF 指數、權證等代號長度異常的）
        if (s.Code.length > 6) return false;
        return (
          s.Code.startsWith(query) ||
          s.Name.toLowerCase().includes(query)
        );
      })
      .slice(0, 10)
      .map(s => ({
        ticker: `${s.Code}.TW`,
        name: s.Name,
        code: s.Code,
      }));

    return res.status(200).json({ results });
  } catch (e) {
    return res.status(500).json({ error: e.message, results: [] });
  }
}
