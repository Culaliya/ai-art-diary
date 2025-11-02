const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 初始化 Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/gemini_vision', async (req, res) => {
  try {
    const { prompt, base64Image, temperature = 0.7 } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: '請提供圖片' });
    }

    // 使用 Gemini 2.0 Flash 模型（支援圖像生成）
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: temperature,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });

    // 準備圖片數據
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg'
      }
    };

    // 發送請求
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    
    // 檢查是否有生成的圖片
    if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      
      // 嘗試從不同可能的位置提取圖片
      let imageBase64 = null;
      
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            imageBase64 = part.inlineData.data;
            break;
          }
        }
      }

      if (imageBase64) {
        return res.json({ 
          success: true,
          image_base64: imageBase64,
          message: '圖片生成成功'
        });
      }
    }

    // 如果沒有圖片，返回文字回應
    const text = response.text();
    return res.json({ 
      success: false,
      text: text,
      error: 'API 未返回圖片，可能需要調整 prompt 或使用支援圖片生成的模型'
    });

  } catch (error) {
    console.error('Gemini Vision API Error:', error);
    return res.status(500).json({ 
      error: error.message || '處理圖片時發生錯誤',
      details: error.toString()
    });
  }
});

module.exports = router;
