// api/news.js — NewsAPI 優先，額度用完自動切換 Google News RSS
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { name, ticker } = req.query;
  if (!name && !ticker) return res.status(400).json({ error: "name or ticker required" });

  const newsApiKey = process.env.NEWS_API_KEY;
  const searchTerm = name || ticker;

  // ── 方法一：NewsAPI ─────────────────────────────────────────────────────────
  if (newsApiKey) {
    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchTerm)}&language=zh&sortBy=publishedAt&pageSize=5&apiKey=${newsApiKey}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const json = await r.json();

      if (json.status === "ok" && json.articles?.length > 0) {
        const news = json.articles.map(a => ({
          title:   a.title?.replace(/\s*-\s*[^-]+$/, "") || "", // 去掉來源後綴
          pubDate: a.publishedAt,
          source:  a.source?.name || "",
          link:    a.url || "",
        })).filter(a => a.title);
        return res.status(200).json({ news, source: "newsapi" });
      }

      // 額度用完或無結果，fallback
      if (json.code === "rateLimited" || json.code === "maximumResultsReached") {
        throw new Error("rate_limited");
      }
    } catch (e) {
      // 繼續執行 fallback
    }
  }

  // ── 方法二：Google News RSS fallback ────────────────────────────────────────
  try {
    const query = encodeURIComponent(`${searchTerm} 股票`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error("RSS fetch failed");
    const xml = await r.text();

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const item = match[1];
      const title   = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || "";
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || "";
      const source  = (item.match(/<source[^>]*>(.*?)<\/source>/))?.[1] || "";
      const link    = (item.match(/<link>(.*?)<\/link>/))?.[1] || "";
      if (title) items.push({
        title: title.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">"),
        pubDate, source, link,
      });
    }
    res.status(200).json({ news: items, source: "google_rss" });
  } catch (e) {
    res.status(200).json({ news: [], error: e.message });
  }
}
