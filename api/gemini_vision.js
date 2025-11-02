/**
 * 👻 Gemini 靈異顯像儀專用 API v2
 * type 可為：
 *  - "ghost-analyzer"：生成 JSON 報告（純分析）
 *  - "ghost-visualizer"：生成影像（base64）
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "伺服器缺少 GEMINI_API_KEY" });

  const { prompt, base64Logo, type } = req.body;
  if (!base64Logo)
    return res.status(400).json({ error: "缺少 base64Logo（上傳圖片）" });

  let modelName;
  let systemInstruction = null;
  let responseSchema = null;
  let generationConfig = {};

  // === 👁 模式選擇 ===
  if (type === "ghost-analyzer") {
    // ✅ 分析模式：輸出 JSON
    modelName = "gemini-2.5-flash-preview-09-2025";
    systemInstruction = {
      parts: [
        {
          text: `
你是一位冷靜的靈異分析師，會從圖片中分析是否存在靈體、氣場異常或光影異常。
請生成以下格式的 JSON 回覆：
{
  "status": "detected" 或 "clear",
  "description": "詳細描述靈異現象或氣場異常",
  "probability": 0~1 的數值
}`,
        },
      ],
    };
    responseSchema = {
      type: "object",
      properties: {
        status: { type: "string" },
        description: { type: "string" },
        probability: { type: "number" },
      },
      required: ["status", "description", "probability"],
    };
    generationConfig = {
      responseMimeType: "application/json",
      responseSchema,
    };
  } else if (type === "ghost-visualizer") {
    // ✅ 顯像模式：生成影像
    modelName = "gemini-2.5-flash-image-preview";
    generationConfig = { responseModalities: ["IMAGE"] };
  } else {
    return res.status(400).json({ error: "未知的處理類型。" });
  }

  const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    // === 組合 Prompt ===
    const parts = [
      {
        text:
          prompt ||
          "Generate a spectral haunted overlay with faint ghost silhouettes, glowing purple aura, and cinematic film grain. Artistic and eerie.",
      },
      { inlineData: { mimeType: "image/png", data: base64Logo } },
    ];

    const payload = {
      systemInstruction,
      contents: [{ role: "user", parts }],
      generationConfig,
    };

    const r = await fetch(googleApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    if (type === "ghost-analyzer") {
      // JSON 模式
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error("Gemini 沒有返回分析內容");
      return res.status(200).json(JSON.parse(content));
    } else {
      // 圖像模式
      const image =
        data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
          ?.inlineData?.data;
      if (!image)
        throw new Error(
          JSON.stringify(data, null, 2) ||
            "Gemini 沒有返回影像資料 (inlineData)"
        );
      return res.status(200).json({ image_base64: image });
    }
  } catch (err) {
    console.error("🔥 靈異顯像錯誤:", err);
    return res.status(500).json({ error: err.message || "AI 顯像失敗" });
  }
}
