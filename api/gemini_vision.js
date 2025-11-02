/**
 * 👁️ Gemini 靈異顯像儀 v7.1 — 限制強化與備援修正版
 * - 修正：匯入的 rateLimiter 現在包含 Auth
 * - 💥 修正：移除了錯誤的 fallbackModel 邏輯。
 * (備援模型 gemini-2.5-flash-preview-09-2025 是文字模型，不能用於 responseModalities: ["IMAGE"])
 */

import { checkRateLimit } from "./utils/rateLimiter.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const appId = process.env.APP_ID;
  if (!apiKey || !appId) {
    console.error("❌ 缺少必要環境變數 (GEMINI_API_KEY or APP_ID)。");
    return res.status(500).json({ error: "伺服器設定錯誤。" });
  }

  // --- 🔒 速率限制 ---
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown_ip";
  const limitCheck = await checkRateLimit(ip, appId, "gemini_vision", 5, 30000); // 使用預設值

  if (!limitCheck.allowed) {
    if (limitCheck.reason === "limit")
      return res.status(429).json({ error: "💫 今日能量已耗盡" });
    if (limitCheck.reason === "cooldown")
      return res.status(429).json({ error: `💤 請稍候 ${limitCheck.wait} 秒再試` });
    // 處理 db_auth_error 或 db_read_error
    console.error("速率限制檢查失敗:", limitCheck.reason, limitCheck.error);
    return res.status(500).json({ error: "速率限制檢查錯誤" });
  }

  const { prompt, base64Logo, temperature = 0.8 } = req.body;
  if (!base64Logo)
    return res.status(400).json({ error: "請提供 base64Logo（上傳圖片）" });

  // --- 🧠 主模型 (Nano Banana) ---
  const modelImage = "gemini-2.5-flash-image-preview";
  const apiUrlImage = `https://generativelanguage.googleapis.com/v1beta/models/${modelImage}:generateContent?key=${apiKey}`;
  
  const payloadImage = {
    contents: [
      {
        // 圖片模型的 contents 結構比較簡單
        parts: [
          { text: prompt || "Generate spectral ghost overlay with eerie aura and mist" },
          { inlineData: { 
              mimeType: "image/png", 
              data: base64Logo.replace(/^data:image\/\w+;base64,/, "") 
            }
          },
        ],
      },
    ],
    // 💥 修正：generationConfig 必須在 payload 頂層
    generationConfig: { 
        temperature: temperature,
        responseModalities: ["IMAGE"], // 告訴模型我們*只*要圖片
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    ],
  };

  try {
    console.log("👁️ 嘗試使用影像模型生成靈異疊影中...");
    const response = await fetch(apiUrlImage, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadImage),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("⚠️ Gemini API 錯誤:", data);
        throw new Error(data.error?.message || "Gemini API 請求失敗");
    }

    const image =
      data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;

    // --- 檢查結果 ---
    if (image) {
      console.log(`✅ 靈體顯像成功 (${ip})`);
      return res.status(200).json({
        success: true,
        image_base64: image,
        energy: limitCheck.remaining,
      });
    } else {
        // 💥 修正：移除了錯誤的 fallback。如果主模型沒給圖 (例如 NO_IMAGE)，就直接回傳。
        console.error("❌ 主模型未回傳影像。", JSON.stringify(data, null, 2));
        const finishReason = data.candidates?.[0]?.finishReason;
        const errorMsg = finishReason === "NO_IMAGE" 
            ? "AI 拒絕生成影像 (安全機制觸發)" 
            : "Gemini 無法生成影像。";
        return res.status(500).json({ error: errorMsg, raw: data });
    }
  } catch (err) {
    console.error("🔥 靈異顯像錯誤:", err);
    return res.status(500).json({ error: err.message || "AI 顯像失敗" });
  }
}
