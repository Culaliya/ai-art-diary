/**
 * 👁️ Gemini 靈異顯像儀 v7.0 — 限制強化版
 * 功能：
 *  - 使用 Firestore IP 限制（共用 utils/rateLimiter）
 *  - 主模型：gemini-2.5-flash-image-preview
 *  - 備援模型：gemini-2.5-flash-preview-09-2025
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
    console.error("❌ 缺少必要環境變數。");
    return res.status(500).json({ error: "伺服器設定錯誤。" });
  }

  // --- 🔒 速率限制 ---
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown_ip";
  const limitCheck = await checkRateLimit(ip, appId, "gemini_vision");

  if (!limitCheck.allowed) {
    if (limitCheck.reason === "limit")
      return res.status(429).json({ error: "💫 今日能量已耗盡" });
    if (limitCheck.reason === "cooldown")
      return res.status(429).json({
        error: `💤 請稍候 ${limitCheck.wait} 秒再試`,
      });
    return res.status(500).json({ error: "速率限制檢查錯誤" });
  }

  const { prompt, base64Logo, temperature = 0.8 } = req.body;
  if (!base64Logo)
    return res.status(400).json({ error: "請提供 base64Logo（上傳圖片）" });

  // --- 🧠 主模型 ---
  const modelImage = "gemini-2.5-flash-image-preview";
  const apiUrlImage = `https://generativelanguage.googleapis.com/v1beta/models/${modelImage}:generateContent?key=${apiKey}`;
  const payloadImage = {
    contents: [
      {
        parts: [
          { text: prompt || "Generate spectral ghost overlay with eerie aura and mist" },
          { inlineData: { mimeType: "image/png", data: base64Logo.replace(/^data:image\/\w+;base64,/, "") } },
        ],
      },
    ],
    responseModalities: ["IMAGE"],
    generationConfig: { temperature },
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
    let image =
      data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;

    // --- 🪄 備援 ---
    if (!image) {
      console.warn("⚠️ 主模型未回傳圖片，啟動備援模型...");
      image = await fallbackModel(prompt, base64Logo, apiKey, temperature);
    }

    if (image) {
      console.log(`✅ 靈體顯像成功 (${ip})`);
      return res.status(200).json({
        success: true,
        image_base64: image,
        energy: limitCheck.remaining,
      });
    } else {
      console.error("❌ 備援仍無影像回傳。");
      return res.status(500).json({ error: "Gemini 無法生成影像。" });
    }
  } catch (err) {
    console.error("🔥 靈異顯像錯誤:", err);
    return res.status(500).json({ error: err.message || "AI 顯像失敗" });
  }
}

// --- 🪄 備援模型 ---
async function fallbackModel(prompt, base64Logo, apiKey, temperature) {
  const modelBackup = "gemini-2.5-flash-preview-09-2025";
  const apiUrlBackup = `https://generativelanguage.googleapis.com/v1beta/models/${modelBackup}:generateContent?key=${apiKey}`;

  const payloadBackup = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt + "\nCreate a vivid spectral ghostly overlay with glowing aura and mist." },
          { inlineData: { mimeType: "image/png", data: base64Logo.replace(/^data:image\/\w+;base64,/, "") } },
        ],
      },
    ],
    responseModalities: ["IMAGE"],
    generationConfig: { temperature },
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
