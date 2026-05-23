// api/deep-analyze.js — 深度分析（接收財務資料，不用 web search，< 10秒）
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const { ticker, name, price, pct, tech, chips, financials } = req.body;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const sym = ticker.includes(".TW") ? "NT$" : "$";
  const fmtP = (v) => v != null ? `${(v*100).toFixed(1)}%` : "無資料";
  const fmtV = (v) => v != null ? v.toLocaleString() : "無資料";
  const fmtB = (v) => v != null ? `${(v/1e8).toFixed(1)}億` : "無資料";

  const financialSection = financials?.available ? `
【財務數據（Yahoo Finance）】
獲利能力：毛利率 ${fmtP(financials.grossMargin)} | 營業利益率 ${fmtP(financials.operatingMargin)} | 淨利率 ${fmtP(financials.profitMargin)}
資本效率：ROE ${fmtP(financials.roe)} | ROA ${fmtP(financials.roa)}
成長率：營收 ${fmtP(financials.revenueGrowth)} | 獲利 ${fmtP(financials.earningsGrowth)}
財務結構：負債權益比 ${fmtV(financials.debtToEquity)} | 流動比率 ${fmtV(financials.currentRatio?.toFixed(1))}
現金流：自由現金流 ${fmtB(financials.freeCashflow)} | 現金 ${fmtB(financials.totalCash)}
估值：本益比 ${fmtV(financials.trailingPE?.toFixed(1))}x | 遠期PE ${fmtV(financials.forwardPE?.toFixed(1))}x | PB ${fmtV(financials.priceToBook?.toFixed(1))}x | EV/EBITDA ${fmtV(financials.evToEbitda?.toFixed(1))}x | Beta ${fmtV(financials.beta?.toFixed(2))}` :
    "\n【財務數據】無法取得，以訓練資料中的知識推估，請標示「需補充確認」";

  const techSection = tech ? `
【技術指標】MA5:${tech.ma5} MA20:${tech.ma20} RSI:${tech.rsi} 量比:${tech.volRatio}x 趨勢:${tech.trend}` : "";

  const chipsSection = chips?.chips ? `
【籌碼面】外資:${chips.chips.foreign!=null?(chips.chips.foreign>0?"+":"")+chips.chips.foreign+"張":"-"} 投信:${chips.chips.trust!=null?(chips.chips.trust>0?"+":"")+chips.chips.trust+"張":"-"} 三大合計:${chips.chips.totalNet!=null?(chips.chips.totalNet>0?"+":"")+chips.chips.totalNet+"張":"-"}` : "";

  const prompt = `你是「華爾街資深主動型基金經理人」，針對「${name}（${ticker}）」進行深度投資價值審查（繁體中文）。如某數據無法取得請標示「需補充確認」，切勿編造。

【當前市場資料】現價：${sym}${price} | 今日：${pct>0?"+":""}${pct}%${techSection}${chipsSection}
${financialSection}

請依以下結構輸出（每節條列，力求簡潔）：

【一、商業模式與核心競爭力】
• 核心收入來源
• 護城河強度：__/10分，理由：__
• 未來3-5年成長潛力

【二、財務體質】結論：走強 or 走弱？
• 獲利與現金流趨勢
• 資本效率與財務健康度

【三、估值分析】
• 與同業比較（高估/合理/低估）
• 目前市場定價的核心假設

【四、多空辯論】
• 多頭最強論點
• 空頭最強論點
• Base Case：未來12個月展望

【五、投資結論】
• 關鍵催化因素
• 評等：【買入】/【持有】/【避免】— 三句話核心理由`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2500,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.status === 529) {
        await new Promise(r => setTimeout(r, (attempt+1)*2000));
        continue;
      }
      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: err });
      }

      const data = await response.json();
      const stopReason = data.stop_reason;
      const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");

      return res.status(200).json({
        text,
        stopReason,
        truncated: stopReason === "max_tokens",
        hasFinancials: !!financials?.available,
      });
    } catch(e) {
      if (attempt === 1) return res.status(500).json({ error: e.message });
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return res.status(500).json({ error: "分析失敗，請重試" });
}
