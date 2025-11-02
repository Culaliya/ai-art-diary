/**
 * 💖 Gemini 網美濾鏡生成 API (v4)
 * 模型：gemini-2.5-flash-image-preview — 可輸出圖片
 * 限制：每日 5 次 + 30 秒冷卻
 */

const COOLDOWN_MS = 30 * 1000;
const DAILY_LIMIT = 5;
const usageMap = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ 缺少 GEMINI_API_KEY");
    return res.status(500).json({ error: "伺服器未設定 API Key" });
  }

  const userIP =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const now = Date.now();
  const record =
    usageMap.get(userIP) || { count: 0, last: 0, date: new Date().toDateString() };

  // reset daily
  if (record.date !== new Date().toDateString()) {
    record.count = 0;
    record.last = 0;
    record.date = new Date().toDateString();
  }

  const elapsed = now - record.last;
  if (record.count >= DAILY_LIMIT) {
    return res.status(429).json({ error: "今日能量已用盡", energy: 0 });
  }
  if (elapsed < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return res.status(429).json({
      error: `請稍候 ${wait} 秒再試`,
      cooldown: wait,
      energy: DAILY_LIMIT - record.count,
    });
  }

  record.count++;
  record.last = now;
  usageMap.set(userIP, record);

  try {
    const { prompt, base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "缺少 base64Image（上傳圖片）" });
    }

    // 🪞 這裡改成與靈異顯像儀相同的模型
    const modelName = "gemini-2.5-flash-image-preview";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt || "Make this selfie glow with pink dreamy beauty filter" },
            { inlineData: { mimeType: "image/png", data: base64Image } },
          ],
        },
      ],
      generationConfig: { responseModalities: ["IMAGE"] },
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const image =
      data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

    if (image) {
      console.log("✅ 生成成功", userIP);
      return res.status(200).json({
        success: true,
        image_base64: image,
        energy: DAILY_LIMIT - record.count,
      });
    } else {
      console.error("⚠️ 沒有回傳圖片", data);
      return res.status(500).json({ error: "Gemini 沒有回傳圖片", raw: data });
    }
  } catch (err) {
    console.error("🔥 生成錯誤:", err);
    return res.status(500).json({ error: err.message || "AI 錯誤" });
  }
}
