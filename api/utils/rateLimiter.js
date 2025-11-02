/**
 * 🛡️ 通用 Firestore 速率限制器 v2.0
 *
 * 💥 修正：加入了 initializeFirebase 函數 (含 getAuth 和 signInAnonymously)
 * 這是 Vercel Serverless 環境下存取 Firestore (Client SDK) 的必要步驟。
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth"; // 👈 修正：匯入 Auth

// --- Firebase 初始化 ---
let app, db, auth, appId;
let isFirebaseReady = false; // 狀態標記

async function initializeFirebase() {
    // 如果已經初始化過 (熱啟動)，就直接跳過
    if (isFirebaseReady) return; 

    const firebaseConfigStr = process.env.FIREBASE_CONFIG;
    appId = process.env.APP_ID || 'default-app-id'; // 確保 APP_ID 也在 Vercel 環境變數中

    if (!firebaseConfigStr) {
        console.error("❌ 缺少 FIREBASE_CONFIG 環境變數！");
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
        
        // 💥 修正：取得 Auth 實例並登入
        auth = getAuth(app);
        if (!auth.currentUser) {
            console.log("Firebase 尚未登入，執行匿名登入...");
            await signInAnonymously(auth);
            console.log("Firebase 匿名登入成功。");
        } else {
            console.log("Firebase 已登入 (熱啟動)。");
        }
        
        isFirebaseReady = true; // 標記為準備就緒

    } catch (e) {
        console.error("Firebase 初始化或匿名登入失敗:", e);
        const errorMessage = e.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.'
            ? "伺服器資料庫認證失敗 (請檢查 Vercel 上的 FIREBASE_CONFIG 是否正確)。"
            : `Firebase 初始化失敗: ${e.message}`;
        throw new Error(errorMessage);
    }
}


/**
 * 🔸 檢查並更新速率限制
 * @param {string} ip 使用者 IP
 * @param {string} appId 應用程式 ID (來自 env)
 * @param {string} category API 類別 (例如 "toxic_calorie", "gemini_vision")
 * @param {number} limit 每日上限
 * @param {number} cooldownMs 冷卻時間 (毫秒)
 * @returns {Promise<object>} 限制結果
 */
export async function checkRateLimit(ip, appId, category, limit = 5, cooldownMs = 30000) {
    
    try {
        // 💥 修正：在執行任何 Firestore 操作前，必須先確保已登入
        await initializeFirebase();
    } catch (e) {
        console.error("checkRateLimit 中的 Firebase 初始化失敗:", e);
        return { allowed: false, reason: "db_auth_error", error: e.message };
    }

    const safeIp = ip.replace(/[:.]/g, "_");
    const date = new Date().toISOString().split("T")[0];

    // 路徑結構： /artifacts/{appId}/public/data/{category}/{document}
    const dailyRef = doc(db, "artifacts", appId, "public", "data", category, `ip_${safeIp}_date_${date}`);
    const userRef = doc(db, "artifacts", appId, "public", "data", category, `ip_${safeIp}_user_cooldown`); // 改了名稱避免衝突

    let dailyCount = 0, lastUsed = 0;

    try {
        const [dailySnap, userSnap] = await Promise.all([getDoc(dailyRef), getDoc(userRef)]);
        if (dailySnap.exists()) dailyCount = dailySnap.data().count || 0;
        if (userSnap.exists()) lastUsed = userSnap.data().last || 0;
    } catch (e) {
        console.error("⚠️ Firestore 讀取錯誤：", e);
        return { allowed: false, reason: "db_read_error" };
    }

    const now = Date.now();
    if (dailyCount >= limit)
        return { allowed: false, reason: "limit", remaining: 0 };

    if (now - lastUsed < cooldownMs)
        return {
            allowed: false,
            reason: "cooldown",
            wait: Math.ceil((cooldownMs - (now - lastUsed)) / 1000),
        };

    // ✅ 通過檢查，非同步更新 Firestore 計數器 (不需要 await，讓它在背景執行)
    Promise.all([
        setDoc(dailyRef, { count: dailyCount + 1 }, { merge: true }),
        setDoc(userRef, { last: now }, { merge: true }),
    ]).catch(e => {
        // 即使寫入失敗，我們這次也放行，只是 log 錯誤
        console.error("⚠️ Firestore 寫入錯誤：", e);
    });

    return { allowed: true, remaining: limit - (dailyCount + 1) };
}
