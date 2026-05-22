// api/dynamic-sectors.js
// 從 TWSE 動態抓取 13 類產業分類，每類取當日漲幅前3大

// 13 個選定類股，對應 TWSE 官方產業別名稱
const SELECTED_SECTORS = [
  { id:"semiconductor",   code:"14", name:"半導體業",       icon:"⚡" },
  { id:"computer",        code:"15", name:"電腦及週邊設備業", icon:"🖥️" },
  { id:"components",      code:"16", name:"電子零組件業",    icon:"🔩" },
  { id:"optoelectronics", code:"21", name:"光電業",          icon:"💡" },
  { id:"telecom",         code:"22", name:"通信網路業",      icon:"📡" },
  { id:"biotech",         code:"08B",name:"生技醫療業",      icon:"💊" },
  { id:"finance",         code:"29", name:"金融保險",        icon:"🏦" },
  { id:"shipping",        code:"28", name:"航運業",          icon:"🚢" },
  { id:"steel",           code:"11", name:"鋼鐵工業",        icon:"🏭" },
  { id:"digital",         code:"37", name:"數位雲端",        icon:"☁️" },
  { id:"green",           code:"35", name:"綠能環保",        icon:"🌿" },
  { id:"chemical",        code:"08", name:"化學工業",        icon:"⚗️" },
  { id:"machinery",       code:"05", name:"電機機械",        icon:"⚙️" },
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300"); // 快取5分鐘
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ── Step 1：抓上市公司基本資料（含產業別）────────────────────────────────
    const companyRes = await fetch(
      "https://openapi.twse.com.tw/v1/opendata/t187ap03_L",
      { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(10000) }
    );
    if (!companyRes.ok) throw new Error("Company data fetch failed");
    const companies = await companyRes.json();

    // 建立 代號 → 產業別 的對照表
    const industryMap = {};
    companies.forEach(c => {
      if (c["公司代號"] && c["產業別"]) {
        industryMap[c["公司代號"]] = c["產業別"].trim();
      }
    });

    // ── Step 2：抓當日所有股票漲跌幅 ─────────────────────────────────────────
    const priceRes = await fetch(
      `https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL?_=${Date.now()}`,
      { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(10000) }
    );
    if (!priceRes.ok) throw new Error("Price data fetch failed");
    const prices = await priceRes.json();

    // 建立股票資料 map
    const stockMap = {};
    prices.forEach(s => {
      const code = s["證券代號"];
      if (!code) return;
      const close = parseFloat(s["收盤價"]?.replace(/,/g,""));
      const open  = parseFloat(s["開盤價"]?.replace(/,/g,""));
      const change = parseFloat(s["漲跌價差"]?.replace(/,/g,""));
      const prevClose = close - change;
      if (isNaN(close) || isNaN(change) || prevClose <= 0) return;
      const pct = +((change / prevClose) * 100).toFixed(2);
      stockMap[code] = {
        ticker:   `${code}.TW`,
        name:     s["證券名稱"]?.trim() || code,
        price:    close,
        change:   +change.toFixed(2),
        pct,
        volume:   parseInt(s["成交股數"]?.replace(/,/g,"") || "0"),
        currency: "TWD",
      };
    });

    // ── Step 3：依產業分類，取漲幅前3大 ──────────────────────────────────────
    // 先把所有股票按產業分組
    const sectorGroups = {};
    SELECTED_SECTORS.forEach(s => { sectorGroups[s.id] = []; });

    Object.entries(stockMap).forEach(([code, stock]) => {
      const industryCode = industryMap[code];
      if (!industryCode) return;
      const match = SELECTED_SECTORS.find(s => s.code === industryCode);
      if (!match) return;
      sectorGroups[match.id].push(stock);
    });

    // 每個類股排序取前3（漲幅最高）
    const result = SELECTED_SECTORS.map(sector => ({
      id:     sector.id,
      name:   sector.name,
      icon:   sector.icon,
      stocks: (sectorGroups[sector.id] || [])
        .filter(s => !isNaN(s.pct))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3),
      total: (sectorGroups[sector.name] || []).length, // 該類股總成分股數
    }));

    res.status(200).json({ sectors: result, date: new Date().toISOString() });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
