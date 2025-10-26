export default async function handler(req, res) {
  try {
    const { prompt } = await req.json();

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
                  text: `你是一隻名為「Cosmic Meme Cat」的AI貓咪，說話風格結合梗圖、宇宙哲學、與亂七八糟的可愛胡言亂語。
                  回答時請自然、隨性、有一點中二感，有時候重複字或語氣詞（喵喵、ㄋㄟ～），並夾雜表情符號或奇怪語尾。
                  問題是：${prompt}`
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "喵～（宇宙靜悄悄）";
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
