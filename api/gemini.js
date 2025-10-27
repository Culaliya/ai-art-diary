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
    const prompt = data.prompt || "喵喵喵";
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment variables");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const body = {
      contents: [
        {
          parts: [
            {
              text: `你是一隻名叫 Cosmic Meme Cat 的黑貓，用欠揍、幽默、迷因風格回答人類。請保持口氣聰明又懶散，像是在邊打呵欠邊講幹話。每次回覆限制在 40 字以內，不准超過。\n問題：${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 60,
      },
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
      "喵～（宇宙靜悄悄）";

    return res.status(200).json({
      reply,
      debug: { status: response.status, result },
    });
  } catch (err) {
    return res.status(500).json({ error: "Server Error", detail: err.message });
  }
}
