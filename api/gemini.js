export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const data = JSON.parse(Buffer.concat(buffers).toString());
    const prompt = data.prompt || "喵喵喵";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment variables.");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `你是一隻黑貓，名叫Cosmic Meme Cat。請用搞笑、迷因、帶一點中二風的方式回覆：${prompt}`,
                },
              ],
            },
          ],
        }),
      }
    );

    const result = await response.json();

    // 安全取回回覆
    const reply =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "喵～（宇宙信號失聯中）";

    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
