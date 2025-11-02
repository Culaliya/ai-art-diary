/**
 * 👻 Gemini 靈異顯像儀 Vision 影像生成 API（支援 base64）
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "伺服器缺少 GEMINI_API_KEY" });

  const modelName = "gemini-2.5-flash-image"; // ✅ 改成影像生成模型
  const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    const { prompt, base64Logo } = req.body;
    if (!base64Logo)
      return res.status(400).json({ error: "缺少 base64Logo（上傳圖片）" });

    const enhancedPrompt =
      prompt ||
      `Generate a haunted spectral overlay with eerie mist, glowing purple aura, faint faces, 
      cinematic ghost lighting, and horror double-exposure film grain.`;

    const payload = {
      contents: [
        {
          parts: [
            { text: enhancedPrompt },
            { inlineData: { mimeType: "image/png", data: base64Logo } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        responseMimeType: "image/png",
      },
    };

    const r = await fetch(googleApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    const image = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (image) {
      console.log("✅ 靈體影像生成成功");
      return res.status(200).json({ image_base64: image });
    } else {
      console.error("⚠️ Gemini 未回傳影像", data);
      return res.status(500).json({ error: "Gemini 沒有回傳影像", raw: data });
    }
  } catch (err) {
    console.error("🔥 靈異顯像錯誤:", err);
    return res.status(500).json({ error: "AI 顯像失敗", detail: err.message });
  }
}
