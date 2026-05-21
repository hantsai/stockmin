// api/analyze.js — Vercel Serverless Function
// Proxies Anthropic API, keeping API key safe on server side

export const config = { runtime: "edge" }; // Edge runtime supports streaming

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const body = await req.json();
    const { prompt } = body;
    if (!prompt) return new Response(JSON.stringify({ error: "prompt required" }), { status: 400 });

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        stream:     true,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    // Stream the response directly back to the client
    return new Response(upstream.body, {
      headers: {
        "Content-Type":                "text/event-stream",
        "Cache-Control":               "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
