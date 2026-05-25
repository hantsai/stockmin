// api/market-overview.js — 抓取大盤指數、三大法人、類股資料
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── 台灣時間判斷 ────────────────────────────────────────────────────────────
  const now = new Date();
  const twStr = now.toLocaleString("en-US", { timeZone: "Asia/Taipei" });
  const tw = new Date(twStr);
  const hour = tw.getHours();
  const minute = tw.getMinutes();
  const day = tw.getDay(); // 0=日,1=一...6=六
  const timeStr = `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;
  const dateStr = tw.toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
    year:"numeric", month:"2-digit", day:"2-digit", weekday:"short"
  });

  let marketStatus;
  if (day === 0 || day === 6) marketStatus = "weekend";
  else if (hour < 9) marketStatus = "premarket";
  else if (hour < 13 || (hour === 13 && minute <= 30)) marketStatus = "open";
  else marketStatus = "aftermarket";

  // ── Step 1：Yahoo Finance 逐一抓指數（批次常失敗，改單一抓取）───────────────
  const symbolMap = {
    twii:  "^TWII",
    dji:   "%5EDJI",
    sp500: "%5EGSPC",
    ixic:  "%5EIXIC",
    sox:   "%5ESOX",
    n225:  "%5EN225",
    ks11:  "%5EKS11",
    dxy:   "DX-Y.NYB",
    twd:   "TWD%3DX",
  };

  const fetchOne = async (sym) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d&_=${Date.now()}`;
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) return null;
      const d = await r.json();
      const meta = d.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const price  = meta.regularMarketPrice ?? null;
      const prev   = meta.chartPreviousClose ?? meta.previousClose ?? null;
      const change = price != null && prev != null ? +(price - prev).toFixed(2) : null;
      const pct    = price != null && prev != null ? +((price - prev) / prev * 100).toFixed(2) : null;
      return { price, change, pct };
    } catch { return null; }
  };

  // 並行抓取
  const [twii, dji, sp500, ixic, sox, n225, ks11, dxy, twd] = await Promise.all([
    fetchOne(symbolMap.twii),
    fetchOne(symbolMap.dji),
    fetchOne(symbolMap.sp500),
    fetchOne(symbolMap.ixic),
    fetchOne(symbolMap.sox),
    fetchOne(symbolMap.n225),
    fetchOne(symbolMap.ks11),
    fetchOne(symbolMap.dxy),
    fetchOne(symbolMap.twd),
  ]);

  const indices = { twii, dji, sp500, ixic, sox, n225, ks11, dxy, twd };

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
      const total = rows.find(row => row[0] === "合計");
      if (total) {
        const toNum = s => parseInt((s||"0").replace(/,/g,"")) || 0;
        const foreign = toNum(total[4]) - toNum(total[5]);
        const trust   = toNum(total[9]) - toNum(total[10]);
        const dealer  = toNum(total[14])- toNum(total[15]);
        institutionals = { foreign, trust, dealer, total: foreign + trust + dealer };
      }
    }
  } catch(e) { console.log("institutionals error:", e.message); }

  // ── Step 3：TWSE 類股行情（取成交金額前5大）──────────────────────────────
  let topSectors = [];
  try {
    const r = await fetch(
      "https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?response=json&type=IND&_=" + Date.now(),
      { signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const data = await r.json();
      // MI_INDEX 類股資料：欄位 [指數, 收市, 漲跌, 漲跌幅%, 成交金額(千元)]
      const tables = data.tables || [];
      let rows = [];
      tables.forEach(t => { if(t.data) rows = rows.concat(t.data); });
      const parsed = rows
        .filter(row => row.length >= 5 && row[0] && !row[0].includes("發行量"))
        .map(row => ({
          name:   row[0],
          pct:    parseFloat((row[3]||"0").replace(/[+%,]/g,"")) || 0,
          volume: parseInt((row[4]||"0").replace(/,/g,"")) || 0,
        }))
        .filter(s => s.volume > 0);
      parsed.sort((a,b) => b.volume - a.volume);
      topSectors = parsed.slice(0,5);
    }
  } catch(e) { console.log("sectors error:", e.message); }

  return res.status(200).json({
    indices,
    institutionals,
    topSectors,
    meta: { timeStr, dateStr, marketStatus, day },
    weekend: day === 0 || day === 6,
  });
}
