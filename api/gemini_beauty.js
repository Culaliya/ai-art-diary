/**
 * 💖 Gemini 網美濾鏡與換裝實驗室 v6
 * 模型：gemini-2.5-flash-image-preview（支援輸出影像）
 * 主題：角色一致性高的 AI 時尚人像生成
 */

const COOLDOWN_MS = 30 * 1000; // 30秒冷卻
const DAILY_LIMIT = 5;          // 每日上限
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

  // 每日重置
  if (record.date !== new Date().toDateString()) {
    record.count = 0;
    record.last = 0;
    record.date = new Date().toDateString();
  }

  const elapsed = now - record.last;
  if (record.count >= DAILY_LIMIT) {
    return res.status(429).json({ error: "今日能量已用盡 💫", energy: 0 });
  }
  if (elapsed < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return res.status(429).json({
      error: `請稍候 ${wait} 秒再試 💖`,
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

    // ✨ 各主題 prompt 設計：不換頭、換裝換場景（高質感時尚攝影風）
    const stylePrompts = {
      paris: `
使用上傳圖片中的人物，以高畫質特寫 (high-definition close-up shot) 呈現，
她正優雅地坐在陽光灑落的法式咖啡廳落地窗邊，穿著精緻的法式連衣裙與珍珠耳環。
柔和的逆光 (soft backlighting) 襯托髮絲光澤與自然妝容，整體色調為奶油白與金色。
背景輕微景深模糊，畫面具有巴黎電影感。8K 專業時尚人像攝影。`,

      nyc: `
使用上傳圖片中的人物，以全身照 (full-body shot) 呈現，
她自信地走在紐約街頭，穿著設計感十足的黑色皮革大衣與高跟長靴。
採低角度拍攝 (low-angle shot)，展現時尚氣勢。
光線為戲劇性的城市夜景燈光，背景為霓虹街道。
畫面質感為時尚雜誌級，強調高光與陰影對比。電影感構圖，8K 時裝攝影。`,

      beach: `
使用上傳圖片中的人物，以中距離人像構圖呈現，
她坐在陽光充沛的白色沙灘上，穿著飄逸的白色亞麻洋裝與草帽，回眸微笑。
光線為黃金時刻 (golden hour) 陽光，背景為藍綠色海水與棕櫚樹。
色彩乾淨明亮，飽和自然。旅行寫真風格，8K 超清人像。`,

      neon: `
使用上傳圖片中的人物，以半身特寫 (medium close-up shot) 呈現，
她站在粉紫與藍色霓虹街頭，穿著銀色亮面夾克與高光妝容。
光線柔和、臉部乾淨，背景為都市夜景光暈。
採時尚攝影棚級補光，強調膚色平衡與皮膚光澤。
畫面具有高端韓系夜拍感，非詭異風格。雜誌封面質感。`,

      vintage: `
使用上傳圖片中的人物，以半身構圖 (medium shot) 呈現，
她坐在老式藝廊的木椅上，穿著奶油色復古洋裝與紅唇妝容。
光線為柔霧自然光 (diffused daylight)，背景為懷舊油畫牆面與花瓶。
畫面呈現法式膠片顏色、柔焦邊緣、膚色自然。
風格為復古時尚人像攝影，8K 細節。`,

      nature: `
使用上傳圖片中的人物，以全身照 (full-body shot) 呈現，
她漫步在森林光影中，穿著淺綠長裙與草帽。
光線柔和，背景帶有霧氣與自然植被，氛圍空靈清新。
畫面為高質感環境人像攝影，色調自然柔和，8K。`,

      studio: `
使用上傳圖片中的人物，以高質感影棚構圖 (studio close-up) 呈現，
她穿著黑色高級禮服與金屬耳飾，背景為灰黑漸層布景。
採用三點式柔光 (soft key lighting)，突出臉部輪廓與膚質細節。
風格為高級時尚棚拍，畫面冷調乾淨，8K 頂級人像攝影。`,

      pastel: `
使用上傳圖片中的人物，以半身構圖 (half-body shot) 呈現，
她被包圍在柔和的粉色與藍色雲霧中，穿著夢幻薄紗與珍珠飾品。
光線漫射，整體畫面如夢似幻，採 pastel 淡彩色調。
畫面明亮乾淨，風格為夢幻雜誌封面，8K 高清。`,

      snow: `
使用上傳圖片中的人物，以中距離構圖 (medium shot) 呈現，
她走在飄雪街頭，穿著白色毛呢大衣與圍巾，背景帶有模糊霓虹光。
光線柔和，畫面呈現冬季冷暖對比。
風格為浪漫冬季人像攝影，8K 超清細節。`,

      glam: `
使用上傳圖片中的人物，以半身構圖呈現，
她在豪華派對現場舉杯微笑，穿著亮片禮服與金色飾品。
背景為燈串與模糊人群，光線閃爍柔和。
畫面風格為派對時尚美妝大片，8K 人像寫真。`,
    };

    const prompt =
      stylePrompts[style] ||
      `使用上傳圖片中的人物，以高畫質人像構圖呈現。
她穿著優雅服飾，置身於時尚場景，光線柔和自然。
整體風格為粉紫柔光時尚人像，8K。`;

    // === 送出請求 ===
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
      data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;

    if (image) {
      console.log(`✅ 成功生成影像：${style} (${userIP})`);
      return res.status(200).json({
        success: true,
        image_base64: image,
        energy: DAILY_LIMIT - record.count,
      });
    } else {
      console.error("⚠️ 沒有回傳圖片", data);
      return res.status(500).json({
        error: "Gemini 沒有回傳圖片",
        raw: data,
      });
    }
  } catch (err) {
    console.error("🔥 錯誤:", err);
    return res.status(500).json({ error: err.message || "AI 錯誤" });
  }
}
