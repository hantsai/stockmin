// api/deep-analyze.js — 深度分析，含 web search + 財務資料
// 使用較高的 max_tokens，並回傳 stop_reason 讓前端判斷是否截斷

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const { ticker, name, price, pct, tech, chips } = req.body;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  // ── Step 1：抓 Yahoo Finance 財務資料 ────────────────────────────────────────
  let financials = null;
  try {
    const sym = encodeURIComponent(ticker);
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${sym}?modules=financialData,defaultKeyStatistics,incomeStatementHistory,cashflowStatementHistory,balanceSheetHistory&_=${Date.now()}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const json = await r.json();
      const result = json.quoteSummary?.result?.[0];
      if (result) {
        const fd = result.financialData || {};
        const ks = result.defaultKeyStatistics || {};
        const is = result.incomeStatementHistory?.incomeStatementHistory || [];
        const cf = result.cashflowStatementHistory?.cashflowStatements || [];

        financials = {
          // 基本財務
          roe:              fd.returnOnEquity?.raw,
          roa:              fd.returnOnAssets?.raw,
          grossMargin:      fd.grossMargins?.raw,
          operatingMargin:  fd.operatingMargins?.raw,
          profitMargin:     fd.profitMargins?.raw,
          debtToEquity:     fd.debtToEquity?.raw,
          currentRatio:     fd.currentRatio?.raw,
          revenueGrowth:    fd.revenueGrowth?.raw,
          earningsGrowth:   fd.earningsGrowth?.raw,
          freeCashflow:     fd.freeCashflow?.raw,
          totalCash:        fd.totalCash?.raw,
          totalDebt:        fd.totalDebt?.raw,
          // 估值
          trailingPE:       ks.trailingPE?.raw,
          forwardPE:        ks.forwardPE?.raw,
          priceToBook:      ks.priceToBook?.raw,
          evToEbitda:       ks.enterpriseToEbitda?.raw,
          beta:             ks.beta?.raw,
          // 歷史損益（最近4季）
          recentRevenue: is.slice(0,4).map(s=>({
            date: s.endDate?.fmt,
            revenue: s.totalRevenue?.raw,
            netIncome: s.netIncome?.raw,
            grossProfit: s.grossProfit?.raw,
          })),
          // 現金流（最近4季）
          recentCashflow: cf.slice(0,4).map(s=>({
            date: s.endDate?.fmt,
            operatingCF: s.totalCashFromOperatingActivities?.raw,
            freeCF: s.freeCashFlow?.raw,
          })),
        };
      }
    }
  } catch (e) {
    console.log("Yahoo Finance financials error:", e.message);
  }

  // ── Step 2：組裝 prompt ───────────────────────────────────────────────────────
  const sym = ticker.includes(".TW") ? "NT$" : "$";
  const fmtN = (v, unit="") => v != null ? `${(v*100).toFixed(1)}%${unit}` : "無資料";
  const fmtV = (v, unit="") => v != null ? `${v.toLocaleString()}${unit}` : "無資料";

  const financialSection = financials ? `
【財務數據（Yahoo Finance）】
獲利能力：毛利率 ${fmtN(financials.grossMargin)} | 營業利益率 ${fmtN(financials.operatingMargin)} | 淨利率 ${fmtN(financials.profitMargin)}
資本效率：ROE ${fmtN(financials.roe)} | ROA ${fmtN(financials.roa)}
成長率：營收成長 ${fmtN(financials.revenueGrowth)} | 獲利成長 ${fmtN(financials.earningsGrowth)}
財務結構：負債權益比 ${fmtV(financials.debtToEquity)} | 流動比率 ${fmtV(financials.currentRatio)}
現金流：自由現金流 ${financials.freeCashflow ? (financials.freeCashflow/1e8).toFixed(1)+"億" : "無資料"} | 現金 ${financials.totalCash ? (financials.totalCash/1e8).toFixed(1)+"億" : "無資料"}
估值：本益比 ${fmtV(financials.trailingPE?.toFixed(1))}x | 遠期PE ${fmtV(financials.forwardPE?.toFixed(1))}x | PB ${fmtV(financials.priceToBook?.toFixed(1))}x | EV/EBITDA ${fmtV(financials.evToEbitda?.toFixed(1))}x | Beta ${fmtV(financials.beta?.toFixed(2))}
` : "\n【財務數據】無法從 Yahoo Finance 取得，請用 web search 補充\n";

  const techSection = tech ? `
【技術指標】
MA5: ${tech.ma5} | MA20: ${tech.ma20} | RSI: ${tech.rsi} | 量比: ${tech.volRatio}x | 趨勢: ${tech.trend}
` : "";

  const chipsSection = chips?.chips ? `
【籌碼面（前一交易日）】
外資: ${chips.chips.foreign != null ? (chips.chips.foreign > 0 ? "+" : "") + chips.chips.foreign + "張" : "-"}
投信: ${chips.chips.trust != null ? (chips.chips.trust > 0 ? "+" : "") + chips.chips.trust + "張" : "-"}
三大合計: ${chips.chips.totalNet != null ? (chips.chips.totalNet > 0 ? "+" : "") + chips.chips.totalNet + "張" : "-"}
` : "";

  const prompt = `你是「華爾街資深主動型基金經理人」與「頂級投資銀行研究主管」的雙重角色，針對「${name}（${ticker}）」進行深度投資價值審查。請融合嚴謹財務數據與商業洞察，用繁體中文撰寫。如某數據無法取得，請明確標示「需補充確認」，切勿編造。

【當前市場資料】
現價：${sym}${price} | 今日：${pct > 0 ? "+" : ""}${pct}%
${techSection}${chipsSection}${financialSection}

請依以下結構輸出（每節重點條列，力求簡潔精準）：

【一、商業模式與核心競爭力】
• 核心收入來源與客戶結構
• 護城河評估（品牌/網路效應/轉換成本/成本優勢/專利）護城河強度：__/10 分，理由：__
• 未來5-10年成長潛力（結合AI/產業趨勢）

【二、財務體質】（結論：走強 or 走弱？）
• 營收與獲利趨勢
• 利潤率變化
• 現金流健康度
• 資本效率（ROE/負債水準）

【三、估值分析】
• 與主要競爭對手估值比較
• 目前股價：高估 / 合理 / 低估？
• DCF 隱含市場假設

【四、多空辯論】
• 多頭最強論點（未定價利多）
• 空頭最強論點（隱含風險）
• Base Case：未來12-24個月展望

【五、投資結論】
• 關鍵催化因素
• 短期（1年）vs 長期（5年）展望
• 評等：【買入】/【持有】/【避免】— 三句話核心理由`;

  // ── Step 3：呼叫 Claude，啟用 web search，max_tokens 4000 ──────────────────
  for (let attempt = 0; attempt < 3; attempt++) {
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
          max_tokens: 4000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (response.status === 529) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 3000));
        continue;
      }
      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: err });
      }

      const data = await response.json();
      const stopReason = data.stop_reason; // "end_turn" or "max_tokens"
      const text = (data.content || [])
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");

      return res.status(200).json({
        text,
        stopReason,          // 前端用來判斷是否截斷
        truncated: stopReason === "max_tokens",
        hasFinancials: !!financials,
      });

    } catch (e) {
      if (attempt === 2) return res.status(500).json({ error: e.message });
      await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
    }
  }

  return res.status(529).json({ error: "AI 服務暫時過載，請稍後再試" });
}
