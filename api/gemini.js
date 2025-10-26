export default async function handler(req, res) {
  // ===== CORS 設定（這很重要！）=====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 處理預檢請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只接受 POST 請求
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  try {
    // Vercel 會自動解析 JSON body，直接使用 req.body
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }
    
    // 檢查環境變數
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY in environment variables");
      return res.status(500).json({ error: "API key not configured" });
    }
    
    console.log("Calling Gemini API with prompt:", prompt);
    
    // 呼叫 Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `你是一隻黑貓，名叫 Cosmic Meme Cat。請用搞笑、迷因、帶點中二風的語氣回覆：${prompt}`,
                },
              ],
            },
          ],
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log("Gemini API response:", result);
    
    const reply =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "喵～（宇宙信號失聯中）";
    
    return res.status(200).json({ reply });
    
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ 
      error: err.message,
      details: "請檢查 Vercel 的 Function Logs"
    });
  }
}
