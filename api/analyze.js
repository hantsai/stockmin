// api/analyze.js — with retry on 529
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  // 最多重試 3 次，遇到 529 等待後重試
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
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (response.status === 529 || response.status === 529) {
        // 過載，等待後重試
        await new Promise(r => setTimeout(r, (attempt + 1) * 3000));
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: err });
      }

      const data = await response.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      return res.status(200).json({ text });

    } catch (e) {
      if (attempt === 2) return res.status(500).json({ error: e.message });
      await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
    }
  }

  return res.status(529).json({ error: "AI 服務暫時過載，請稍後再試" });
}

