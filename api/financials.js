// api/financials.js — 抓 Yahoo Finance 財務資料（快速，< 5秒）
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  try {
    const sym = encodeURIComponent(ticker);
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${sym}?modules=financialData,defaultKeyStatistics,incomeStatementHistory,cashflowStatementHistory&_=${Date.now()}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(7000),
    });

    if (!r.ok) return res.status(200).json({ available: false });

    const json = await r.json();
    const result = json.quoteSummary?.result?.[0];
    if (!result) return res.status(200).json({ available: false });

    const fd = result.financialData || {};
    const ks = result.defaultKeyStatistics || {};
    const is = result.incomeStatementHistory?.incomeStatementHistory || [];
    const cf = result.cashflowStatementHistory?.cashflowStatements || [];

    return res.status(200).json({
      available: true,
      roe:             fd.returnOnEquity?.raw,
      roa:             fd.returnOnAssets?.raw,
      grossMargin:     fd.grossMargins?.raw,
      operatingMargin: fd.operatingMargins?.raw,
      profitMargin:    fd.profitMargins?.raw,
      debtToEquity:    fd.debtToEquity?.raw,
      currentRatio:    fd.currentRatio?.raw,
      revenueGrowth:   fd.revenueGrowth?.raw,
      earningsGrowth:  fd.earningsGrowth?.raw,
      freeCashflow:    fd.freeCashflow?.raw,
      totalCash:       fd.totalCash?.raw,
      totalDebt:       fd.totalDebt?.raw,
      trailingPE:      ks.trailingPE?.raw,
      forwardPE:       ks.forwardPE?.raw,
      priceToBook:     ks.priceToBook?.raw,
      evToEbitda:      ks.enterpriseToEbitda?.raw,
      beta:            ks.beta?.raw,
      recentRevenue: is.slice(0,4).map(s=>({
        date: s.endDate?.fmt,
        revenue: s.totalRevenue?.raw,
        netIncome: s.netIncome?.raw,
      })),
      recentCashflow: cf.slice(0,4).map(s=>({
        date: s.endDate?.fmt,
        operatingCF: s.totalCashFromOperatingActivities?.raw,
        freeCF: s.freeCashFlow?.raw,
      })),
    });
  } catch(e) {
    return res.status(200).json({ available: false, error: e.message });
  }
}
