export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(buffers).toString());
    const prompt = data.prompt || "嗡嗡嗡";
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment variables");
    }
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
    const body = {
      contents: [
        {
          parts: [
            {
              text: `你是一隻黑貓 Cosmic Meme Cat，用搖剖、迷因、哲學語汥回答人類。問題：${prompt}`,
            },
          ],
        },
      ],
    };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const resultText = await response.text();
    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      result = { raw: resultText };
    }
    if (!response.ok) {
      return res.status(response.status).json({
        error: "❌ Gemini API Error",
        status: response.status,
        result,
      });
    }
    const reply =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "嗡～（宇宙靜悔悔）";
    return res.status(200).json({
      reply,
      debug: {
        status: response.status,
        result,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server Error",
      detail: err.message,
    });
  }
}
