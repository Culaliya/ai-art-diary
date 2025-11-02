/**
 * 💄 Gemini 網美濾鏡實驗室 API
 * 將自拍轉換成多種夢幻風格（維持真實五官）
 * 適用：Vercel Serverless 無 Express 架構
 */

export default async function handler(req, res) {
  // 僅允許 POST 請求
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ 缺少 GEMINI_API_KEY");
    return res.status(500).json({ error: "伺服器未設定 API Key" });
  }

  try {
    const { prompt, base64Image, temperature = 0.8 } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: "請提供 base64Image（上傳的圖片）" });
    }

    // 模型名稱（支援圖片輸入）
    const model = "gemini-2.0-pro-vision";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 組合請求 Payload
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt || "Make this selfie more aesthetic and cinematic" },
            {
              inlineData: {
                data: base64Image,
                mimeType: "image/jpeg",
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        topP: 0.9,
        topK: 40,
        candidateCount: 1,
      },
    };

    // 呼叫 Google Gemini API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // 嘗試提取回傳的圖片
    const imageData =
      data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

    if (imageData) {
      console.log("✅ 網美濾鏡生成成功");
      return res.status(200).json({
        success: true,
        image_base64: imageData,
        message: "圖片生成成功",
      });
    } else {
      console.error("⚠️ 沒有回傳圖片:", data);
      return res.status(500).json({
        success: false,
        error: "Gemini 沒有回傳圖片，可能模型不支援或 prompt 不適合。",
        raw: data,
      });
    }
  } catch (err) {
    console.error("🔥 錯誤：", err);
    return res.status(500).json({
      success: false,
      error: err.message || "AI 轉換過程發生錯誤",
    });
  }
}
