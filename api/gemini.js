/**
 * 🍔 Gemini 多模態「毒舌卡路里計算機」
 * 分析食物照片，吐槽＋估算熱量
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

  const model = "gemini-2.5-flash-preview-09-2025";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const { prompt, base64Logo } = req.body;
    if (!base64Logo) {
      return res.status(400).json({ error: "請提供食物照片（base64Logo）。" });
    }

    // --- 系統人設 ---
    const systemInstruction = {
      parts: [
        {
          text: `
你是一位毒舌營養師兼美食評論家，口氣尖銳但有趣。
請針對圖片內容吐槽、揶揄，並估算大致的熱量（大卡）。
輸出格式必須是 JSON，包含三個欄位：
{
  "review": "毒舌評論",
  "estimated_calories": 整數,
  "items": ["偵測到的食物項目"]
}
請勿出現非 JSON 的文字。`
        }
      ]
    };

    // --- 使用者內容（圖片 + 額外提示）---
    const parts = [
      { text: prompt || "幫我毒舌分析這份食物的熱量。" },
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Logo,
        },
      },
    ];

    const payload = {
      systemInstruction,
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // --- 回傳 Gemini 的 JSON 結果 ---
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    if (!content) throw new Error("AI 沒有返回內容");

    // 嘗試解析為 JSON
    const result = JSON.parse(content);
    return res.status(200).json(result);

  } catch (err) {
    console.error("❌ Gemini API 錯誤:", err);
    return res.status(500).json({ error: err.message || "分析失敗" });
  }
}
