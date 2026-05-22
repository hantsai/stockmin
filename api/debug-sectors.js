export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const r = await fetch("https://openapi.twse.com.tw/v1/opendata/t187ap03_L",
      { signal: AbortSignal.timeout(10000) });
    const data = await r.json();

    // 找台積電、聯發科、廣達、中華電、台達電的代碼
    const targets = ["2330","2454","2382","2412","2308","2303","6285","2881","3711"];
    const found = data.filter(c => targets.includes(c["公司代號"]))
      .map(c => ({ code: c["公司代號"], name: c["公司名稱"], industry: c["產業別"] }));

    // 也列出所有代碼的第一個公司
    const codeMap = {};
    data.forEach(c => {
      if(c["產業別"] && !codeMap[c["產業別"]]) 
        codeMap[c["產業別"]] = c["公司簡稱"] || c["公司名稱"];
    });

    res.status(200).json({ found, codeMap });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
