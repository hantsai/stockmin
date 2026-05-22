export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const r = await fetch(
      `https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL?_=${Date.now()}`,
      { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(10000) }
    );
    const data = await r.json();
    res.status(200).json({
      count: data.length,
      sample: data.slice(0, 3),
      keys: data.length > 0 ? Object.keys(data[0]) : [],
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
