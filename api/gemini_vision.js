/**
 * 👁️ Gemini 靈異顯像儀 v6.5：影像生成 + 自動備援
 * 主模型：gemini-2.5-flash-image-preview（影像輸出）
 * 備援模型：gemini-2.5-flash-preview-09-2025（文字多模態）
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ 缺少 GEMINI_API_KEY");
    return res.status(500).json({ error: "伺服器設定錯誤：缺少 API Key。" });
  }

  const { prompt, base64Logo, temperature = 0.8 } = req.body;
  if (!base64Logo) {
    return res.status(400).json({ error: "請提供 base64Logo（上傳圖片）" });
  }

  // --- 🧠 主要模型：影像生成 ---
  const modelImage = "gemini-2.5-flash-image-preview";
  const apiUrlImage = `https://generativelanguage.googleapis.com/v1beta/models/${modelImage}:generateContent?key=${apiKey}`;

  const payloadImage = {
    contents: [
      {
        parts: [
          { text: prompt || "Generate spectral ghost overlay with eerie aura and mist" },
          { inlineData: { mimeType: "image/png", data: base64Logo } },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      temperature: temperature,
    },
  };

  try {
    console.log("👁️ 嘗試使用影像模型生成靈異疊影中...");
    const response = await fetch(apiUrlImage, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadImage),
    });

    const data = await response.json();
    let image =
      data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;

    // --- 若無影像，觸發備援 ---
    if (!image) {
      console.warn("⚠️ 影像模型未回傳圖片，啟動備援文字多模態模型...");
      image = await fallbackModel(prompt, base64Logo, apiKey, temperature);
    }

    if (image) {
      console.log("✅ 靈體顯像成功！");
      return res.status(200).json({ image_base64: image });
    } else {
      console.error("❌ 備援仍無影像回傳。");
      return res.status(500).json({ error: "Gemini 無法生成影像，請稍後重試。" });
    }
  } catch (err) {
    console.error("🔥 靈異顯像錯誤:", err);
    return res.status(500).json({ error: err.message || "AI 顯像失敗" });
  }
}

/**
 * 🪄 備援模型（多模態文字轉影像）
 */
async function fallbackModel(prompt, base64Logo, apiKey, temperature) {
  const modelBackup = "gemini-2.5-flash-preview-09-2025";
  const apiUrlBackup = `https://generativelanguage.googleapis.com/v1beta/models/${modelBackup}:generateContent?key=${apiKey}`;

  const payloadBackup = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt + "\nCreate a vivid spectral ghostly overlay with glowing aura and mist." },
          { inlineData: { mimeType: "image/png", data: base64Logo } },
        ],
      },
    ],
    generationConfig: {
      temperature: temperature,
      responseModalities: ["IMAGE"],
    },
  };

  try {
    const response = await fetch(apiUrlBackup, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadBackup),
    });
    const data = await response.json();
    const image =
      data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;

    if (image) console.log("💜 備援模型成功回傳影像！");
    return image || null;
  } catch (err) {
    console.error("💀 備援模型失敗:", err);
    return null;
  }
}
