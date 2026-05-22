export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const r = await fetch("https://openapi.twse.com.tw/v1/opendata/t187ap03_L",
      { signal: AbortSignal.timeout(10000) });
    const data = await r.json();
    const codeMap = {};
    data.forEach(c => {
      const code = c["產業別"];
      if(code && !codeMap[code]) codeMap[code] = c["公司名稱"];
    });
    res.status(200).json({ total: data.length, codeMap });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
