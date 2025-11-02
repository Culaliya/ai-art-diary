/**
 * 💄 Gemini 網美濾鏡實驗室 API v3
 * 功能：每日次數限制 + 冷卻機制 + AI 圖像生成
 * 適用環境：Vercel 無 Express 架構
 */

const COOLDOWN_MS = 30 * 1000;  // 30 秒冷卻時間
const DAILY_LIMIT = 5;          // 每日限額

// 暫存記錄使用者請求（記憶體版，Vercel 每次冷啟會重置）
const usageMap = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ 缺少 GEMINI_API_KEY");
    return res.status(500).json({ error: "伺服器未設定 API Key" });
  }

  // 取得使用者 IP
  const userIP =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  // 檢查限額與冷卻
  const now = Date.now();
  const record = usageMap.get(userIP) || { count: 0, last: 0, date: new Date().toDateString() };

  // 若是新的一天，重置統計
  if (record.date !== new Date().toDateString()) {
    record.count = 0;
    record.last = 0;
    record.date = new Date().toDateString();
  }

  const elapsed = now - record.last;
  if (record.count >= DAILY_LIMIT) {
    return res.status(429).json({
      error: "今日免費次數已用完 💫",
      energy: 0,
      resetAt: record.date,
    });
  }

  if (elapsed < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return res.status(429).json({
      error: `請稍候 ${wait} 秒後再試 💫`,
      cooldown: wait,
      energy: DAILY_LIMIT - record.count,
    });
  }

  // 記錄請求
  record.count++;
  record.last = now;
  usageMap.set(userIP, record);

  try {
    const { prompt, base64Image, temperature = 0.8 } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "請提供 base64Image（上傳的圖片）" });
    }

    // 模型設定
    const model = "gemini-2.0-pro-vision";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt || "Enhance selfie with dreamy cinematic aesthetic, maintain real face." },
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

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const imageData =
      data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

    if (imageData) {
      console.log(`✅ ${userIP} 生成成功 (${record.count}/${DAILY_LIMIT})`);
      return res.status(200).json({
        success: true,
        image_base64: imageData,
        message: "圖片生成成功",
        energy: DAILY_LIMIT - record.count,
      });
    } else {
      console.error("⚠️ 沒有回傳圖片:", data);
      return res.status(500).json({
        success: false,
        error: "Gemini 沒有回傳圖片。",
        energy: DAILY_LIMIT - record.count,
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
