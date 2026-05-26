// api/market-overview.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── 台灣時間判斷 ────────────────────────────────────────────────────────────
  const now = new Date();
  const twStr = now.toLocaleString("en-US", { timeZone: "Asia/Taipei" });
  const tw = new Date(twStr);
  const hour = tw.getHours();
  const minute = tw.getMinutes();
  const day = tw.getDay();
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
    fetchOne("^TWII"), fetchOne("^DJI"), fetchOne("^GSPC"),
    fetchOne("^IXIC"), fetchOne("^SOX"), fetchOne("^N225"),
    fetchOne("^KS11"), fetchOne("DX-Y.NYB"), fetchOne("TWD=X"),
  ]);
  const indices = { twii, dji, sp500, ixic, sox, n225, ks11, dxy, twd };

  // ── Step 2：TWSE 三大法人（TWT38U，市場合計）─────────────────────────────
  // 欄位：[0]機構 [1]買進(千元) [2]賣出(千元) [3]買賣差額(千元)
  //       外資/投信/自營各佔一行，最後一行是合計
  let institutionals = null;
  try {
    const r = await fetch(
      "https://www.twse.com.tw/rwd/zh/fund/BFI82U?response=json&type=day&_=" + Date.now(),
      { headers:{"User-Agent":"Mozilla/5.0"}, signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const data = await r.json();
      const rows = data.data || [];
      const toNum = s => {
        if (!s) return 0;
        const n = parseInt((s||"0").replace(/,/g,"").replace(/\+/g,""));
        return isNaN(n) ? 0 : n;
      };
      // BFI82U 欄位：[0]類別 [1]買進 [2]賣出 [3]差額(千元)
      // 找各機構那行
      const foreignRow = rows.find(r => r[0] && (r[0].includes("外陸資") || r[0].includes("外資")));
      const trustRow   = rows.find(r => r[0] && r[0].includes("投信"));
      const dealerRow  = rows.find(r => r[0] && r[0].includes("自營"));
      const totalRow   = rows.find(r => r[0] && r[0].includes("合計"));

      if (foreignRow || totalRow) {
        const foreign = toNum(foreignRow?.[3]);
        const trust   = toNum(trustRow?.[3]);
        const dealer  = toNum(dealerRow?.[3]);
        const total   = totalRow ? toNum(totalRow[3]) : foreign + trust + dealer;
        // BFI82U 單位是千元，換算成億元（÷100000）
        institutionals = {
          foreign: Math.round(foreign/100000),
          trust:   Math.round(trust/100000),
          dealer:  Math.round(dealer/100000),
          total:   Math.round(total/100000),
        };
      }
    }
  } catch(e) { console.log("BFI82U error:", e.message); }

  // ── Step 3：TWSE 類股指數漲跌（MI_INDEX，取漲幅前5大類股）──────────────
  // 欄位：[0]指數名稱 [1]收盤指數 [2]漲跌HTML [3]漲跌點數 [4]漲跌百分比(%) [5]特殊處理
  // 類股名稱格式：xxx類指數
  let topSectors = [];
  try {
    const r = await fetch(
      "https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?response=json&type=IND&_=" + Date.now(),
      { headers:{"User-Agent":"Mozilla/5.0"}, signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const data = await r.json();
      const tables = data.tables || [];
      let rows = [];
      tables.forEach(t => { if(t.data) rows = rows.concat(t.data); });

      const parsed = rows
        .filter(row =>
          row.length >= 5 &&
          row[0] &&
          row[0].endsWith("類指數") // 只取真正的類股
        )
        .map(row => ({
          name: row[0].replace("類指數",""), // 去掉「類指數」讓名稱簡短
          pct:  parseFloat((row[4]||"0").replace(/[+%,]/g,"")) || 0,
        }))
        .filter(s => !isNaN(s.pct));

      // 按漲幅排序取前5
      parsed.sort((a,b) => b.pct - a.pct);
      topSectors = parsed.slice(0,5);
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
