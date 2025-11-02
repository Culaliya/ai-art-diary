/**
 * 💖 Gemini 網美濾鏡實驗室 v7（修正版）
 * 模型：gemini-2.5-flash-image-preview（支援影像輸出）
 * 功能：網美換場景 + 能量限制 + 14 組時尚風格
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
  if (!apiKey) return res.status(500).json({ error: "伺服器未設定 GEMINI_API_KEY" });

  const userIP =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const now = Date.now();
  const record = usageMap.get(userIP) || { count: 0, last: 0, date: new Date().toDateString() };

  // 重置每日使用
  if (record.date !== new Date().toDateString()) {
    record.count = 0;
    record.last = 0;
    record.date = new Date().toDateString();
  }

  if (record.count >= DAILY_LIMIT)
    return res.status(429).json({ error: "今日能量已耗盡 💫", energy: 0 });

  const elapsed = now - record.last;
  if (elapsed < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return res
      .status(429)
      .json({ error: `請稍候 ${wait} 秒再試 💖`, cooldown: wait, energy: DAILY_LIMIT - record.count });
  }

  record.count++;
  record.last = now;
  usageMap.set(userIP, record);

  try {
    const { style, base64Image } = req.body;
    if (!base64Image) return res.status(400).json({ error: "缺少 base64Image（上傳圖片）" });

    // ✨ 所有主題 prompt
    const stylePrompts = {
      paris: `使用上傳圖片中的人物，以高畫質特寫呈現，法式咖啡廳陽光下的浪漫。柔和逆光與奶油色調。`,
      nyc: `使用上傳圖片中的人物，以全身照呈現，紐約街頭時尚街拍風。黑色皮革外套與長靴。`,
      beach: `人物在海灘黃金時刻光線下，穿著白色洋裝與草帽，背景藍綠海與棕櫚樹。`,
      neon: `半身夜拍霓虹風，粉紫與藍色光暈，膚色柔亮，城市倒影，時尚雜誌質感。`,
      vintage: `人物在復古藝廊中，穿奶油色洋裝與紅唇，法式膠片色調與柔光氛圍。`,
      nature: `全身照，人物漫步於森林光影中，柔霧自然光與綠色調。環境人像攝影。`,
      studio: `高質感影棚棚拍，人物穿黑色高級禮服，灰黑漸層背景，柔光三點補光。`,
      pastel: `半身構圖，人物被粉色與藍色雲霧包圍，夢幻柔焦雜誌封面風。`,
      snow: `中距離構圖，人物穿白色大衣走在飄雪街頭，背景有霓虹反射光。`,
      glam: `半身構圖，人物在派對現場，穿亮片禮服，背景燈串與柔焦人群。`,
      // 💎 新增韓系棚拍風
      kfashion: `
使用上傳圖片中的人物，在高級韓系攝影棚內，
光線均勻、背景極簡灰白，人物穿著時尚高領針織與珍珠飾品。
構圖為中景半身照，風格乾淨俐落，肌膚柔光，膚色自然，
畫面具有韓系雜誌封面質感，8K 超清人像攝影。`,
      // 🏨 新增奢華旅拍風
      hotel: `
使用上傳圖片中的人物，在奢華飯店套房中，
坐在落地窗邊的金色沙發上，穿著絲質睡袍或禮服。
光線為午後暖陽，背景有城市景觀與柔霧。
構圖優雅，氛圍高貴典雅。高端旅拍攝影風格，8K 人像。`,
    };

    const prompt =
      stylePrompts[style] || `使用上傳圖片中的人物，以高質感時尚風格生成人像。`;

    // ✅ 正確 Payload 結構
    const modelName = "gemini-2.5-flash-image-preview";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/png", data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.8,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      ],
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const image =
      data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;

    if (image) {
      console.log(`✅ 生成成功：${style} (${userIP})`);
      return res.status(200).json({
        success: true,
        image_base64: image,
        energy: DAILY_LIMIT - record.count,
      });
    } else {
      console.error("⚠️ 沒有回傳圖片：", data);
      return res.status(500).json({ error: "Gemini 沒有回傳圖片", raw: data });
    }
  } catch (err) {
    console.error("🔥 Gemini 錯誤：", err);
    return res.status(500).json({ error: err.message || "AI 錯誤" });
  }
}
