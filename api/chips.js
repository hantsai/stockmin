// api/chips.js — 個股籌碼面資料
// 外資/投信/自營商買賣超 + 本益比/殖利率/淨值比
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const code = ticker.replace(".TW","").replace(".TWO","");
  if (!/^\d+$/.test(code)) {
    return res.status(200).json({ available: false, reason: "非台股，無籌碼資料" });
  }

  const results = await Promise.allSettled([
    fetchValuation(code),
    fetchThreeInstitutions(code),
  ]);

  const valuation = results[0].status === "fulfilled" ? results[0].value : null;
  const chips     = results[1].status === "fulfilled" ? results[1].value : null;

  res.status(200).json({
    available: !!(valuation || chips),
    ticker,
    valuation,  // 本益比、殖利率、淨值比
    chips,      // 外資、投信、自營商
  });
}

// ── 本益比 / 殖利率 / 淨值比（TWSE BWIBBU_d）───────────────────────────────
async function fetchValuation(code) {
  const r = await fetch("https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_d", {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error();
  const data = await r.json();
  const s = data.find(d => d.Code === code);
  if (!s) throw new Error("not found");
  return {
    date:          s.Date,
    per:           s.PEratio          ? +s.PEratio          : null, // 本益比
    pbr:           s.PBratio          ? +s.PBratio          : null, // 淨值比
    dividendYield: s.DividendYield    ? +s.DividendYield    : null, // 殖利率%
  };
}

// ── 三大法人買賣超（TWSE 個股三大法人）────────────────────────────────────────
async function fetchThreeInstitutions(code) {
  // 用今天日期查詢
  const now = new Date();
  // 格式 YYYYMMDD
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;

  const url = `https://www.twse.com.tw/rwd/zh/fund/T86?date=${dateStr}&stockNo=${code}&response=json&_=${Date.now()}`;
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error();
  const json = await r.json();

  // T86 回傳格式：data 陣列，每列為一支股票的三大法人資料
  // 欄位順序：[證券代號, 證券名稱, 外資買, 外資賣, 外資淨, 投信買, 投信賣, 投信淨, 自營買, 自營賣, 自營淨, 三大法人合計]
  if (!json.data || json.stat !== "OK") throw new Error("no data");

  const row = json.data.find(d => d[0] === code);
  if (!row) throw new Error("stock not found");

  const parse = v => v ? +String(v).replace(/,/g,"") : null;

  return {
    date:        json.date || dateStr,
    foreign:     parse(row[4]),   // 外資買賣超（張）
    trust:       parse(row[7]),   // 投信買賣超（張）
    dealer:      parse(row[10]),  // 自營商買賣超（張）
    totalNet:    parse(row[11]),  // 三大法人合計
  };
}
