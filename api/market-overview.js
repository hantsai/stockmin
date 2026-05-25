// api/market-overview.js — 抓取大盤指數、三大法人、類股資料
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const fmtQ = (q) => {
    if (!q || q.regularMarketPrice == null) return null;
    return {
      price:  q.regularMarketPrice?.raw ?? null,
      pct:    q.regularMarketChangePercent?.raw != null
                ? parseFloat((q.regularMarketChangePercent.raw * 100).toFixed(2))
                : null,
      change: q.regularMarketChange?.raw ?? null,
      volume: q.regularMarketVolume?.raw ?? null,
      name:   q.shortName || q.longName || null,
    };
  };

  // ── Step 1：Yahoo Finance 批次抓指數 ────────────────────────────────────────
  const symbols = [
    "^TWII",      // 台股加權
    "^DJI",       // 道瓊
    "^GSPC",      // S&P500
    "^IXIC",      // 納斯達克
    "^SOX",       // 費半
    "^N225",      // 日經
    "^KS11",      // 韓國 KOSPI
    "DX-Y.NYB",   // 美元指數
    "TWD=X",      // 美元/台幣
  ];

  let indices = {};
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}&_=${Date.now()}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const data = await r.json();
      const quotes = data.quoteResponse?.result || [];
      quotes.forEach(q => { indices[q.symbol] = fmtQ(q); });
    }
  } catch(e) { console.log("indices error:", e.message); }

  // ── Step 2：TWSE 三大法人 ──────────────────────────────────────────────────
  let institutionals = null;
  try {
    const r = await fetch(
      "https://www.twse.com.tw/rwd/zh/fund/TWT38U?response=json&_=" + Date.now(),
      { signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const data = await r.json();
      const rows = data.data || [];
      // 找「合計」那行
      const total = rows.find(row => row[0] === "合計");
      if (total) {
        const toNum = s => parseInt((s||"0").replace(/,/g,"")) || 0;
        institutionals = {
          foreign: toNum(total[4]) - toNum(total[5]),  // 外資買-賣
          trust:   toNum(total[9]) - toNum(total[10]), // 投信買-賣
          dealer:  toNum(total[14])- toNum(total[15]), // 自營買-賣
        };
        institutionals.total = institutionals.foreign + institutionals.trust + institutionals.dealer;
      }
    }
  } catch(e) { console.log("institutionals error:", e.message); }

  // ── Step 3：TWSE 類股成交量前5大 ──────────────────────────────────────────
  let topSectors = [];
  try {
    const r = await fetch(
      "https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?response=json&_=" + Date.now(),
      { signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const data = await r.json();
      const rows = data.data || [];
      // 按成交金額排序取前5
      const parsed = rows.map(row => ({
        name:   row[0],
        pct:    parseFloat(row[4]) || 0,
        volume: parseInt((row[2]||"0").replace(/,/g,"")) || 0,
      })).filter(s => s.volume > 0);
      parsed.sort((a,b) => b.volume - a.volume);
      topSectors = parsed.slice(0, 5);
    }
  } catch(e) { console.log("sectors error:", e.message); }

  // ── Step 4：判斷台灣時間與市場狀態 ────────────────────────────────────────
  const now = new Date();
  const twTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const hour = twTime.getHours();
  const minute = twTime.getMinutes();
  const day = twTime.getDay(); // 0=日, 1=一...5=五, 6=六
  const timeStr = `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;
  const dateStr = twTime.toLocaleDateString("zh-TW", { year:"numeric", month:"2-digit", day:"2-digit", weekday:"short" });

  // 判斷市場狀態
  let marketStatus;
  if (day === 0 || day === 6) {
    marketStatus = "weekend"; // 週末
  } else if (hour < 9) {
    marketStatus = "premarket"; // 盤前（美股剛收盤）
  } else if (hour < 13 || (hour === 13 && minute <= 30)) {
    marketStatus = "open"; // 盤中
  } else {
    marketStatus = "aftermarket"; // 收盤後
  }

  return res.status(200).json({
    indices,
    institutionals,
    topSectors,
    meta: { timeStr, dateStr, marketStatus, day },
  });
}
