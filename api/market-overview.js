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

  // ── Step 1：Yahoo Finance 逐一抓指數 ───────────────────────────────────────
  const fetchOne = async (sym) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d&_=${Date.now()}`;
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) return null;
      const d = await r.json();
      const meta = d.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const price = meta.regularMarketPrice ?? null;
      const prev  = meta.chartPreviousClose ?? meta.previousClose ?? null;
      const change = price != null && prev != null ? +(price - prev).toFixed(2) : null;
      const pct    = price != null && prev != null ? +((price - prev) / prev * 100).toFixed(2) : null;
      return { price, change, pct };
    } catch { return null; }
  };

  const [twii, dji, sp500, ixic, sox, n225, ks11, dxy, twd] = await Promise.all([
    fetchOne("^TWII"),
    fetchOne("^DJI"),
    fetchOne("^GSPC"),
    fetchOne("^IXIC"),
    fetchOne("^SOX"),
    fetchOne("^N225"),
    fetchOne("^KS11"),
    fetchOne("DX-Y.NYB"),
    fetchOne("TWD=X"),
  ]);

  const indices = { twii, dji, sp500, ixic, sox, n225, ks11, dxy, twd };

  // ── Step 2：TWSE 三大法人（T86 端點）──────────────────────────────────────
  let institutionals = null;
  try {
    const r = await fetch(
      "https://www.twse.com.tw/rwd/zh/fund/T86?response=json&selectType=ALL&_=" + Date.now(),
      { headers:{"User-Agent":"Mozilla/5.0"}, signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const data = await r.json();
      const rows = data.data || [];
      // 找「合計」那行（最後一行通常是合計）
      const total = rows.find(row => row[0]==="合計") || rows[rows.length-1];
      if (total && total.length >= 10) {
        const toNum = s => parseInt((s||"0").replace(/,/g,"").replace(/\+/g,"")) || 0;
        // T86 欄位：[0]機構, [1]買進金額, [2]賣出金額, [3]買賣差額, ...
        // 但格式可能因日期不同，用買賣差額欄位
        const foreign = toNum(total[3]);  // 外資買賣差額
        const trust   = toNum(total[6]);  // 投信買賣差額
        const dealer  = toNum(total[9]);  // 自營買賣差額
        institutionals = { foreign, trust, dealer, total: foreign + trust + dealer };
      }
    }
  } catch(e) { console.log("T86 error:", e.message); }

  // 若 T86 失敗，嘗試 TWT38U
  if (!institutionals) {
    try {
      const r = await fetch(
        "https://www.twse.com.tw/rwd/zh/fund/TWT38U?response=json&_=" + Date.now(),
        { headers:{"User-Agent":"Mozilla/5.0"}, signal: AbortSignal.timeout(6000) }
      );
      if (r.ok) {
        const data = await r.json();
        const rows = data.data || [];
        const total = rows.find(row => row[0]==="合計");
        if (total) {
          const toNum = s => parseInt((s||"0").replace(/,/g,"")) || 0;
          const foreign = toNum(total[4]) - toNum(total[5]);
          const trust   = toNum(total[9]) - toNum(total[10]);
          const dealer  = toNum(total[14])- toNum(total[15]);
          institutionals = { foreign, trust, dealer, total: foreign + trust + dealer };
        }
      }
    } catch(e) { console.log("TWT38U error:", e.message); }
  }

  // ── Step 3：TWSE 類股指數（MI_INDEX，取漲幅前5大）────────────────────────
  let topSectors = [];
  try {
    const r = await fetch(
      "https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?response=json&type=IND&_=" + Date.now(),
      { headers:{"User-Agent":"Mozilla/5.0"}, signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const data = await r.json();
      // MI_INDEX 回傳多個 tables，找 fields 包含「指數」的
      const tables = data.tables || [];
      let rows = [];
      for (const t of tables) {
        if (t.fields && t.fields.some(f => f.includes("指數") || f.includes("類股"))) {
          rows = rows.concat(t.data || []);
        }
      }
      // 若沒找到，取所有 data
      if (rows.length === 0) {
        tables.forEach(t => { if(t.data) rows = rows.concat(t.data); });
      }

      const parsed = rows
        .filter(row => row.length >= 4 && row[0] && !row[0].includes("發行量"))
        .map(row => {
          // 欄位：[指數名稱, 收市指數, 漲跌(點), 漲跌幅(%)]
          const pctStr = (row[3]||row[2]||"0").replace(/[+%,]/g,"");
          const pct = parseFloat(pctStr) || 0;
          // 用漲跌幅絕對值排序找強勢類股
          return { name: row[0], pct, absPct: Math.abs(pct) };
        })
        .filter(s => s.name && s.name.length > 1);

      // 按漲幅排序取前5（只取上漲的）
      parsed.sort((a,b) => b.pct - a.pct);
      topSectors = parsed.slice(0,5).map(s => ({ name:s.name, pct:s.pct }));
    }
  } catch(e) { console.log("MI_INDEX error:", e.message); }

  return res.status(200).json({
    indices,
    institutionals,
    topSectors,
    meta: { timeStr, dateStr, marketStatus, day },
    weekend: day === 0 || day === 6,
  });
}
