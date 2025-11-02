/**
 * 🍔 Toxic Calorie Analyzer v3.1 — 修復版
 * - 修正：無 (程式碼正確，錯誤在於 rateLimiter)
 * - 調整：將 base64 replace 移至 payload 中
 */

// 匯入修復後的 rateLimiter
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

  // --- 🔒 Firestore 速率限制 ---
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown_ip";
  // checkRateLimit 現在會處理 Firebase Auth
  const limitCheck = await checkRateLimit(ip, appId, "toxic_calorie", 20, 10000);

  if (!limitCheck.allowed) {
    if (limitCheck.reason === "limit")
      return res.status(429).json({ error: "💫 今日能量已耗盡" });
    if (limitCheck.reason === "cooldown")
      return res.status(429).json({ error: `💤 請稍候 ${limitCheck.wait} 秒再試` });
    // 處理 db_auth_error 或 db_read_error
    console.error("速率限制檢查失敗:", limitCheck.reason, limitCheck.error);
    return res.status(500).json({ error: "速率限制檢查錯誤" });
  }

  // --- 🧠 Gemini 熱量分析邏輯 ---
  const { base64Image } = req.body;
  if (!base64Image)
    return res.status(400).json({ error: "缺少 base64Image（上傳圖片）" });

  const prompt = `
你是一個專業的營養師。根據使用者上傳的食物照片，請：
1. 判斷食物種類（盡可能詳細，例如牛排、奶油義大利麵、珍珠奶茶等）。
2. 估算該份量的大致熱量（以 kcal 表示）。
3. 若有多樣食物，列出各自的熱量估值與總熱量。
請用簡潔的繁體中文回覆，格式如下：
---
🍱 食物辨識：
🔥 熱量預估：
💡 營養小提示：
---
`;

  // 確保使用支援多模態 (圖片+文字) 的模型
  const model = "gemini-1.5-pro-latest"; // 或 gemini-2.5-flash-preview-09-2025
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { 
              mimeType: "image/png", 
              // 確保 base64 前綴被移除
              data: base64Image.replace(/^data:image\/\w+;base64,/, "") 
            } 
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.4 },
    safetySettings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    ],
  };

  try {
    console.log("🍔 進行熱量分析中...");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();

    if (!response.ok) {
        console.error("⚠️ Gemini API 錯誤:", data);
        throw new Error(data.error?.message || "Gemini API 請求失敗");
    }

    const textOutput = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      ?.join("\n");

    if (textOutput) {
      console.log(`✅ 熱量分析成功 (${ip})`);
      return res.status(200).json({
        success: true,
        result: textOutput,
        energy: limitCheck.remaining,
      });
    } else {
      console.error("⚠️ Gemini 沒有回傳文字。", data);
      return res.status(500).json({ error: "Gemini 未回傳結果。", raw: data });
    }
  } catch (err) {
    console.error("🔥 熱量分析錯誤：", err);
    return res.status(500).json({ error: err.message || "AI 分析失敗" });
  }
}
