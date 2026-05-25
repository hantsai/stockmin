// api/deep-analyze.js — 兩段式深度分析，適配 Vercel Hobby 10秒限制
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const { ticker, name, price, pct, tech, chips, financials, part, previousAnalysis } = req.body;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const sym = ticker.includes(".TW") ? "NT$" : "$";
  const fmtP = (v) => v != null ? `${(v*100).toFixed(1)}%` : null;
  const fmtV = (v, d=1) => v != null ? v.toFixed(d) : null;
  const fmtB = (v) => v != null ? `${(v/1e8).toFixed(1)}億` : null;

  // ── 即時數據 ──────────────────────────────────────────────────────────────
  const techLine = tech
    ? `MA5:${tech.ma5} MA20:${tech.ma20} RSI:${tech.rsi} 量比:${tech.volRatio}x 趨勢:${tech.trend}`
    : "無資料";

  const chipsLine = chips?.chips
    ? `外資:${chips.chips.foreign!=null?(chips.chips.foreign>0?"+":"")+chips.chips.foreign+"張":"-"} 投信:${chips.chips.trust!=null?(chips.chips.trust>0?"+":"")+chips.chips.trust+"張":"-"} 三大:${chips.chips.totalNet!=null?(chips.chips.totalNet>0?"+":"")+chips.chips.totalNet+"張":"-"}`
    : "無資料";

  const finLines = [];
  if (financials?.available) {
    if(fmtP(financials.grossMargin))     finLines.push(`毛利率:${fmtP(financials.grossMargin)}`);
    if(fmtP(financials.operatingMargin)) finLines.push(`營業利益率:${fmtP(financials.operatingMargin)}`);
    if(fmtP(financials.profitMargin))    finLines.push(`淨利率:${fmtP(financials.profitMargin)}`);
    if(fmtP(financials.roe))             finLines.push(`ROE:${fmtP(financials.roe)}`);
    if(fmtP(financials.revenueGrowth))   finLines.push(`營收成長:${fmtP(financials.revenueGrowth)}`);
    if(fmtV(financials.trailingPE))      finLines.push(`本益比:${fmtV(financials.trailingPE)}x`);
    if(fmtV(financials.priceToBook))     finLines.push(`PB:${fmtV(financials.priceToBook)}x`);
    if(fmtV(financials.evToEbitda))      finLines.push(`EV/EBITDA:${fmtV(financials.evToEbitda)}x`);
    if(fmtB(financials.freeCashflow))    finLines.push(`自由現金流:${fmtB(financials.freeCashflow)}`);
    if(fmtV(financials.debtToEquity))    finLines.push(`負債權益比:${fmtV(financials.debtToEquity)}`);
  }
  const financialLine = finLines.length > 0
    ? `【即時財務數據（Yahoo Finance）】\n${finLines.join(" | ")}`
    : "【財務數據】Yahoo Finance 無法取得即時數據";

  const context = `重要原則：
- 以下【即時數據】是真實市場資料，請直接使用
- 凡是依賴訓練資料推估的內容，請在該項目前標示「⚠️ 基於訓練資料」
- 完全無法確認的數字請標示「需補充確認」，切勿編造

【即時數據】
股票：${name}（${ticker}）
現價：${sym}${price}　今日：${pct>0?"+":""}${pct}%
技術面：${techLine}
籌碼面：${chipsLine}
${financialLine}`;

  // ── Part 1：商業模式、財務體質、估值 ──────────────────────────────────────
  const prompt1 = `你是資深股票分析師（繁體中文）。

${context}

請嚴格依照以下格式輸出，不要使用表格，用條列式：


【商業模式】⚠️ 基於訓練資料
• 核心收入來源與客戶結構（一句話）
• 護城河強度：X/10，理由：（一句話）

【財務體質】${finLines.length>0?"依據上方即時數據":"⚠️ 基於訓練資料"}
• 結論：走強 or 走弱？
• 核心判斷理由（一句話）
• 現金流健康度（一句話）

【估值分析】
• 目前股價：高估 / 合理 / 低估？（⚠️ 需補充同業即時數據確認）
• 市場目前定價的核心假設（一句話）`;

  // ── Part 2：多空辯論、投資結論（帶入 Part 1 結果）────────────────────────
  const prompt2 = `你是資深股票分析師（繁體中文）。

${context}

【第一段分析摘要（請基於此延伸）】
${previousAnalysis}

請依以下格式輸出（延續上方分析，保持前後一致）：

【多頭最強論點】
• 未被市場完全定價的利多或潛在催化劑（2-3點，訓練資料推估處標示⚠️）

【空頭最強論點】
• 主要風險與威脅（2-3點，訓練資料推估處標示⚠️）

【Base Case】未來12個月最可能的發展（2-3句，與上方商業模式/財務判斷一致）

【投資評等】
評等：【買入】/【持有】/【避免】
核心理由（三句話，呼應上方分析）：
短線（1-3個月）：
長線（1-2年）：`;

  const prompt = part === 2 ? prompt2 : prompt1;

  console.log(`deep-analyze part ${part||1} for ${ticker}`);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
    console.log(`part ${part||1} done, stop_reason:`, data.stop_reason);

    return res.status(200).json({
      text,
      stopReason: data.stop_reason,
      truncated: data.stop_reason === "max_tokens",
      hasFinancials: !!financials?.available,
    });
  } catch(e) {
    console.error("deep-analyze error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
