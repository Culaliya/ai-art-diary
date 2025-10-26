export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ 正確解析 body
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const data = JSON.parse(Buffer.concat(buffers).toString());
    const prompt = data.prompt || "喵喵喵";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment variables.");
    }

    // ✅ 呼叫 Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const result = await response.json();
    const reply =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "喵～（宇宙靜悄悄）";

    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
