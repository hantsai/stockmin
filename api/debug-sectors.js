export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    // 測試公司基本資料
    const companyRes = await fetch(
      "https://openapi.twse.com.tw/v1/opendata/t187ap03_L",
      { signal: AbortSignal.timeout(10000) }
    );
    const companies = await companyRes.json();
    const sample = companies.slice(0, 3);
    const industries = [...new Set(companies.map(c => c["產業別"]).filter(Boolean))].slice(0, 20);

    // 測試價格資料
    const priceRes = await fetch(
      "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL",
      { signal: AbortSignal.timeout(10000) }
    );
    const prices = await priceRes.json();
    const priceSample = prices.slice(0, 3);

    res.status(200).json({
      companyCount: companies.length,
      companySample: sample,
      industries,
      priceCount: prices.length,
      priceSample,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
