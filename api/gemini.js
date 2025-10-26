export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ 改成用 Node 的方式解析 body
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(buffers).toString());
    const prompt = data.prompt || "喵喵喵";

    // ✅ 呼叫 Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `你是一隻名為 Cosmic Meme Cat 的AI貓咪，用迷因語氣與人類對話，內容可以可愛、抽象、又有點哲學。問題是：${prompt}`,
                },
              ],
            },
          ],
        }),
      }
    );

    const result = await response.json();
    const reply =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "喵？（宇宙靜悄悄）";

    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
