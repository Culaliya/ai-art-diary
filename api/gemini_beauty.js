const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 初始化 Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// AI 網美濾鏡生成路由
router.post('/gemini_vision', async (req, res) => {
  try {
    const { prompt, base64Image, temperature = 0.8 } = req.body;

    if (!base64Image) {
      return res.status(400).json({ success: false, error: '請提供圖片 base64Image' });
    }

    // 使用支援圖像生成的 Gemini 2.0 Vision 模型
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-pro-vision',
      generationConfig: {
        temperature,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });

    // 組合 prompt 與圖片
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const candidate = response.candidates?.[0];

    // 嘗試取出圖片資料
    let imageBase64 = null;
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          imageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    // 若有圖片
    if (imageBase64) {
      return res.json({
        success: true,
        message: '✨ 圖片生成成功',
        image_base64: imageBase64
      });
    }

    // 若僅有文字回應
    const textPart = candidate?.content?.parts?.find(p => p.text)?.text || "AI 沒有生成影像。";
    return res.json({
      success: false,
      text: textPart,
      error: 'API 未返回圖片，請調整 prompt 或使用支援 Vision 模型。'
    });

  } catch (error) {
    console.error('🚨 Gemini Beauty API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '處理圖片時發生錯誤',
      details: error.toString()
    });
  }
});

module.exports = router;
