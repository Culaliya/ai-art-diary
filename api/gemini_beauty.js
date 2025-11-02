/**
 * 💖 AI Beauty Studio v8.5 — 完整修復版
 *
 * 包含所有修復：
 * 1. ✅ Firebase Client SDK (非 Admin)
 * 2. ✅ Firebase 匿名登入 (signInAnonymously)
 * 3. ✅ Firestore IP 速率限制 (每日 + 冷卻)
 * 4. ✅ 移除錯誤的 "responseMimeType"
 * 5. ✅ 補上 "HARM_CATEGORY_SEXUALLY_EXPLICIT" 安全設定
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// --- 你的規則 ---
const COOLDOWN_MS = 30000; // 30 秒冷卻
const DAILY_LIMIT = 5; // 每 IP 每日上限

// --- Firebase 初始化 ---
let app, db, auth, appId;
let isFirebaseReady = false; // 狀態標記

async function initializeFirebase() {
    if (isFirebaseReady) return; 

    const firebaseConfigStr = process.env.FIREBASE_CONFIG;
    appId = process.env.APP_ID || 'default-app-id';

    if (!firebaseConfigStr) {
        console.error("缺少 FIREBASE_CONFIG 環境變數！");
        throw new Error("伺服器設定錯誤：缺少 FIREBASE_CONFIG。");
    }

    try {
        const firebaseConfig = JSON.parse(firebaseConfigStr);
        if (getApps().length === 0) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }
        db = getFirestore(app);
        
        auth = getAuth(app);
        if (!auth.currentUser) {
            console.log("Firebase 尚未登入，執行匿名登入...");
            await signInAnonymously(auth);
            console.log("Firebase 匿名登入成功。");
        } else {
            console.log("Firebase 已登入。");
        }
        
        isFirebaseReady = true; // 標記為準備就緒

    } catch (e) {
        console.error("Firebase 初始化或匿名登入失敗:", e);
        // 拋出更具體的錯誤
        const errorMessage = e.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.'
            ? "伺服器資料庫認證失敗 (請檢查 Vercel 上的 FIREBASE_CONFIG 是否正確)。"
            : `Firebase 初始化失敗: ${e.message}`;
        throw new Error(errorMessage);
    }
}

// --- Vercel Handler ---
export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        return res.status(500).json({ error: "伺服器未設定 GEMINI_API_KEY" });
        
    try {
        // 確保 Firebase 準備就緒
        await initializeFirebase();
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }

    // --- 速率限制 (Rate Limiting) ---
    const ip = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown_ip");
    const safeIp = ip.replace(/[:.]/g, '_'); // Firestore 路徑不喜歡特殊字元
    const date = new Date().toISOString().split('T')[0];
    
    // 路徑結構： /artifacts/{appId}/public/data/{collection}/{document}
    const dailyDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'beauty_studio_daily', `ip_${safeIp}_date_${date}`);
    const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'beauty_studio_users', `ip_${safeIp}`);

    let dailyCount = 0;
    let lastUsed = 0;

    try {
        const [dailySnap, userSnap] = await Promise.all([
            getDoc(dailyDocRef),
            getDoc(userDocRef)
        ]);

        if (dailySnap.exists()) dailyCount = dailySnap.data().count || 0;
        if (userSnap.exists()) lastUsed = userSnap.data().last || 0;

    } catch (dbError) {
        console.error(`Firestore 讀取錯誤 (IP: ${ip}):`, dbError);
        return res.status(500).json({ error: "檢查使用次數時發生資料庫錯誤。" });
    }

    const now = Date.now();
    if (dailyCount >= DAILY_LIMIT)
        return res.status(429).json({ error: "💫 今日能量已耗盡", energy: 0 });

    if (now - lastUsed < COOLDOWN_MS) {
        const wait = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
        return res.status(429).json({ error: `💤 請稍候 ${wait} 秒再試`, cooldown: wait, energy: DAILY_LIMIT - dailyCount });
    }
    // --- 速率限制檢查結束 ---


    try {
        // --- Gemini API 呼叫 ---
        const { style, base64Image } = req.body;
        if (!base64Image)
            return res.status(400).json({ error: "缺少 base64Image（上傳圖片）" });
        
        if (base64Image.length > 4_000_000) // 基礎的大小檢查
             return res.status(400).json({ error: "圖片過大，請上傳 4MB 以下檔案" });

        // 💅 全風格 Prompt 清單 (你的設定)
        const stylePrompts = {
             pure: `使用上傳圖片中的人物，保留原始五官與臉型比例，不更換臉部結構。柔化膚質並加強自然光線，使肌膚有自然光澤。呈現清新乾淨的無濾鏡寫真風。`,
             k_id: `使用上傳圖片中的人物，以韓系攝影棚證件照風格呈現。背景乾淨米白，柔光均勻照亮臉部，強調皮膚細緻、氣質自然。`,
             kimono: `使用上傳圖片中的人物，穿著傳統日式和服，背景為櫻花樹與木格窗，柔光氛圍、乾淨高級感。`,
             plush: `使用上傳圖片中的人物，坐在柔軟床上被玩偶圍繞，色調柔和粉彩，氛圍可愛、夢幻。`,
             catlover: `使用上傳圖片中的人物，被多隻可愛貓咪圍繞，背景明亮溫馨，表情自然微笑。`,
             petgarden: `使用上傳圖片中的人物，坐在花園草地上與小狗、兔子互動，陽光與綠色調溫暖自然。`,
             bookcafe: `使用上傳圖片中的人物，在木質調咖啡廳閱讀，窗外陽光灑入，溫暖文青風構圖。`,
             mirror: `使用上傳圖片中的人物，在霧面鏡前拍攝，背景簡潔，冷白光線，現代極簡棚拍風格。`,
             angelic: `使用上傳圖片中的人物，置身白雲與柔光之中，穿白紗，光線柔和，帶有聖潔氛圍。`,
             cyberlove: `使用上傳圖片中的人物，夜晚霓虹街頭，雨後反光地面，粉紫藍色光暈，電影感光影。`,
             santorini: `使用上傳圖片中的人物，於希臘藍白屋頂前，陽光灑落，穿白色洋裝，浪漫旅拍風格。`,
             vogue: `使用上傳圖片中的人物，以灰黑漸層背景、時尚燈光呈現，妝容完整、雜誌封面質感。`,
             princess: `使用上傳圖片中的人物，穿著公主禮服與皇冠，背景夢幻森林或水晶城堡，光線柔亮。`,
             aesthetic: `使用上傳圖片中的人物，藍粉光交錯的抽象彩霧背景，時尚雜誌藝術棚拍風格。`,
             kfashion: `使用上傳圖片中的人物，在韓系攝影棚內，背景灰白，柔光乾淨，人物穿針織上衣與珍珠飾品。8K 專業棚拍質感。`,
             hotel: `使用上傳圖片中的人物，在奢華飯店套房內，坐在金色沙發上，午後陽光，柔霧光線與高貴氛圍。`,
        };
        const prompt = stylePrompts[style] || `使用上傳圖片中的人物，以高質感攝影風格生成時尚肖像。`;
        
        const model = "gemini-2.5-flash-image-preview";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/png", data: base64Image } },
                ],
            }],
            generationConfig: {
                temperature: 0.8,
                // "responseMimeType" 已移除
                responseModalities: ["IMAGE"],
            },
            // 💥 修正 5: 補上 SEXUALLY_EXPLICIT
            safetySettings: [
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            ],
        };

        const r = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await r.json();

        if (!r.ok) {
            // 如果 Google API 出錯 (例如 400 Bad Request, 429 Quota)
            console.error("⚠️ Google API 錯誤:", JSON.stringify(data, null, 2));
            throw new Error(data.error?.message || "Gemini API 請求失敗");
        }
        
        const parts = data?.candidates?.[0]?.content?.parts || [];
        
        // 檢查是否有 "NO_IMAGE"
        if (data.candidates?.[0]?.finishReason === "NO_IMAGE") {
             console.error("⚠️ Gemini 拒絕生成圖片 (NO_IMAGE)", JSON.stringify(data, null, 2));
             return res.status(500).json({ error: "AI 拒絕生成圖片 (可能觸發安全機制)", raw: data });
        }

        const imagePart = parts.find((p) => p.inlineData || p.inline_data);
        const image = imagePart?.inlineData?.data || imagePart?.inline_data?.data || null;

        if (image) {
            console.log(`✅ 出圖成功 [${style}] (${ip})`);
            
            // 成功！更新 Firestore 計數器
            await Promise.all([
                setDoc(dailyDocRef, { count: dailyCount + 1 }, { merge: true }),
                setDoc(userDocRef, { last: now }, { merge: true })
            ]);
            
            return res.status(200).json({
                success: true,
                image_base64: image,
                energy: DAILY_LIMIT - (dailyCount + 1), // 回傳更新後的剩餘次數
            });
        } else {
            // 雖然 r.ok 是 true，但回傳的 JSON 裡沒有圖片
            console.error("⚠️ Gemini 無回傳圖片 (但 API 成功)", JSON.stringify(data, null, 2));
            return res.status(500).json({ error: "AI 沒有回傳圖片 (未知原因)", raw: data });
        }
    } catch (err) {
        console.error("🔥 伺服器錯誤 (Gemini API 或其他)：", err);
        return res.status(500).json({ error: err.message || "AI 錯誤" });
    }
}

