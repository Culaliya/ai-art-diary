export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Fallback replies if API fails
  const fallbackReplies = [
    "喵？我只想打瞌睡。",
    "喵～這問題太哲學。",
    "喵喵喵，先餵我再說吧！",
    "別吵，本喵在做夢。",
    "喵～Wi‑Fi 呢？我要上網。"
  ];

  try {
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(buffers).toString());
    const prompt = data.prompt || "你好";
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY in environment variables");
    }

    const messages = [
      {
        role: "system",
        content: "你是一隻名叫 Cosmic Meme Cat 的黑貓，用欠揍、幽默、迷因風格回答人類。請保持口氣聰明又懶散，像是在邊打呵欠邊講幹話，每次回覆不超過 40 個字。"
      },
      { role: "user", content: prompt }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 100
      })
    });

    const result = await response.json();

    if (!response.ok) {
      const fall = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
      return res.status(200).json({ reply: fall, debug: result });
    }

    const reply = (result.choices?.[0]?.message?.content?.trim()) || fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    return res.status(200).json({ reply, debug: result });
  } catch (err) {
    const fall = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    return res.status(200).json({ reply: fall, debug: { error: err.message } });
  }
}
