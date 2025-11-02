/**
 * 👻 靈異顯像儀專用 Gemini API 後端
 * 生成紫霧靈體疊影影像（Base64 輸出）
 * by Culaliya x GPT-5
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "伺服器缺少 GEMINI_API_KEY" });
  }

  const modelName = "gemini-2.0-pro-vision"; // ✅ 支援影像生成
  const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    const { prompt, base64Logo } = req.body;

    if (!base64Logo) {
      return res.status(400).json({ error: "缺少 base64Logo (上傳圖片)" });
    }

    // ✨ 自動強化 prompt（根據氣氛模式）
    const enhancedPrompt =
      prompt ||
      `Create a haunted paranormal overlay with transparent spectral mist, glowing purple aura, 
       faint human silhouette, cinematic ghost lighting, soft diffusion, double exposure style, 
       eerie horror tone but artistic — use ethereal purple fog as visual base.`;

    // ✅ 構建請求
    const payload = {
      contents: [
        {
          parts: [
            { text: enhancedPrompt },
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Logo,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        topK: 32,
        candidateCount: 1,
      },
    };

    // 🚀 呼叫 Gemini Vision API
    const r = await fetch(googleApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    console.log("Gemini raw response summary:", data.candidates?.[0]?.finishReason);

    // 🔍 抓回圖片 base64
    const image =
      data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;

    if (image) {
      console.log("✅ 靈異影像生成成功");
      return res.status(200).json({ image_base64: image });
    } else {
      console.error("⚠️ 消失訊號", data);
      return res.status(500).json({ error: "消失靈界訊號", raw: data });
    }
  } catch (err) {
    console.error("🔥 錯誤警報：", err);
    return res.status(500).json({ error: "錯誤警報", detail: err.message });
  }
}
