/**
 * 💖 AI Beauty Studio v8.4 — Firestore Auth Fix Edition
 *
 * 💥 修正 3: 解決 500 Error (Could not load default credentials)
 * - 原因：程式碼缺少 Firebase 登入步驟 (signInAnonymously)。
 * - 動作：加入 `initializeFirebase` 函數，確保在讀取 Firestore 前完成匿名登入。
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
// 💥 修正 3.1: 匯入 Auth 模組
import { getAuth, signInAnonymously } from "firebase/auth";

// --- 你的規則 (不變) ---
const COOLDOWN_MS = 30000;
const DAILY_LIMIT = 5;

// --- Firebase 初始化 (改成非同步函數) ---
let app, db, auth, appId;
let isFirebaseReady = false; // 狀態標記

async function initializeFirebase() {
    // 如果已經初始化過 (熱啟動)，就直接跳過
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
        
        // 💥 修正 3.2: 取得 Auth 實例並登入
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
        throw new Error("伺服器連線資料庫時認證失敗。");
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
        
    // 💥 修正 3.3: 在每次請求開始時，都先確保 Firebase 已登入
    try {
        await initializeFirebase();
    } catch (e) {
        // 如果連 Firebase 都連不上，直接回傳錯誤
        return res.status(500).json({ error: e.message });
    }

    // --- 速率限制 (Rate Limiting) ---
    const ip = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown_ip");
    const safeIp = ip.replace(/[:.]/g, '_');
    const date = new Date().toISOString().split('T')[0];
    
    const dailyDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'beauty_studio_daily', `ip_${safeIp}_date_${date}`);
    const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'beauty_studio_users', `ip_${safeIp}`);

    let dailyCount = 0;
    let lastUsed = 0;

    try {
        // 這就是先前出錯的地方 (Object.handler:58:18)
        // 現在因為已經 signInAnonymously，所以 getDoc 會有權限
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
        // (*** 你的 Gemini API 邏輯 - 完全不變 ***)
        // ... (略) ...
        const { style, base64Image } = req.body;
        if (!base64Image)
            return res.status(400).json({ error: "缺少 base64Image（上傳圖片）" });

        const stylePrompts = {
             pure: `使用上傳圖片中的人物，保留原始五官與臉型比例，不更換臉部結構。柔化膚質並加強自然光線，使肌膚有自然光澤。呈現清新乾淨的無濾鏡寫真風。`,
             k_id: `使用上傳圖片中的人物，以韓系攝影棚證件照風格呈現。背景乾淨米白，柔光均勻照亮臉部，強調皮膚細緻、氣質自然。`,
             kimono: `使用上傳圖片中的人物，穿著傳統日式和服，背景為櫻花樹與木格窗，柔光氛圍、乾淨高級感。`,
             plush: `使用上傳圖片中的人物，坐在柔軟床上被玩偶圍繞，色調柔和粉彩，氛圍可愛、夢幻。`,
             catlover: `使用上傳圖片中的人物，被多隻可愛貓咪圍繞，背景明亮溫馨，表情自然微笑。`,
             petgarden: `使用上傳圖片中的人物，坐在花園草地上與小狗、兔子互動，陽光與綠色調溫暖自然。`,
             bookcafe: `使用上圖中的人物，在木質調咖啡廳閱讀，窗外陽光灑入，溫暖文青風構圖。`,
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
                responseModalities: ["IMAGE"],
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ],
        };

        const r = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await r.json();

        if (!r.ok) {
            console.error("⚠️ Google API 錯誤:", JSON.stringify(data, null, 2));
            throw new Error(data.error?.message || "Gemini API 請求失敗");
        }
        
        const parts = data?.candidates?.[0]?.content?.parts || [];
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
                energy: DAILY_LIMIT - (dailyCount + 1),
            });
        } else {
            console.error("⚠️ Gemini 無回傳圖片", JSON.stringify(data, null, 2));
            return res.status(500).json({ error: "Gemini 沒有回傳圖片", raw: data });
        }
    } catch (err) {
        console.error("🔥 伺服器錯誤 (Gemini API 或其他)：", err);
        return res.status(500).json({ error: err.message || "AI 錯誤" });
    }
}
