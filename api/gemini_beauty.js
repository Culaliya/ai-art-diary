/**
 * 💖 Gemini 網美濾鏡生成 API (v5)
 * 模型：gemini-2.5-flash-image-preview — 支援輸出圖片
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
    const { style, base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "缺少 base64Image（上傳圖片）" });
    }

    // 🎨 各濾鏡 Prompt 設計（更自然柔光）
    const stylePrompts = {
      dreamy: `
Make this selfie look like a soft dreamy fantasy portrait.
Use pastel pink and lavender tones, airy light leaks, glowing mist,
add gentle sparkles and warm highlights on the face,
preserve original facial features perfectly, smooth skin, clear eyes,
magazine beauty photo style, IG influencer aesthetic.`,
      
      neon: `
Enhance this selfie with a modern neon-night city style.
Make it cinematic but beautiful, not scary.
Use soft pink, lilac, and cyan tones with elegant light reflection,
K-beauty makeup glow, luminous skin, bright background bokeh,
keep face natural, add neon reflections subtly like a fashion editorial night photo.`,
      
      sunset: `
Transform this selfie into a sunset golden-hour portrait.
Use warm pink and gold light, soft shadows, glowing edges on hair,
dreamy atmosphere, warm skin tone, natural golden filter.
Preserve face shape perfectly with realistic detail and smooth gradient sky.`,
      
      vintage: `
Make this selfie look like a French retro film portrait.
Use creamy tones, vintage lens blur, and soft pastel color grading.
Add warm analog light, subtle film grain, and soft focus background.
Preserve facial features perfectly, elegant and nostalgic atmosphere.`,
    };

    const prompt =
      stylePrompts[style] ||
      "Apply soft pink-lavender lighting, smooth skin, pastel dreamy aesthetic, keep realistic face.";

    const modelName = "gemini-2.5-flash-image-preview";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
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
      console.log("✅ 生成成功:", userIP);
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
    console.error("🔥 錯誤:", err);
    return res.status(500).json({ error: err.message || "AI 錯誤" });
  }
}
