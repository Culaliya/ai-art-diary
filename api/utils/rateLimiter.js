/**
 * 🛡️ 通用 Firestore 速率限制器（適用所有 Gemini/AI API）
 * 每 IP / 每類別 category 皆有獨立冷卻與每日上限。
 * 
 * 使用方式：
 * const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown_ip";
 * const result = await checkRateLimit(ip, process.env.APP_ID, "gemini_vision");
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfigStr = process.env.FIREBASE_CONFIG;
let db;

if (!firebaseConfigStr) {
  console.error("❌ 缺少 FIREBASE_CONFIG");
} else {
  try {
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (err) {
    console.error("❌ Firebase 初始化錯誤：", err);
  }
}

/**
 * 🔸 檢查並更新速率限制
 */
export async function checkRateLimit(ip, appId, category, limit = 5, cooldownMs = 30000) {
  const safeIp = ip.replace(/[:.]/g, "_");
  const date = new Date().toISOString().split("T")[0];

  const dailyRef = doc(db, "artifacts", appId, "public", "data", category, `ip_${safeIp}_date_${date}`);
  const userRef = doc(db, "artifacts", appId, "public", "data", category, `ip_${safeIp}`);

  let dailyCount = 0, lastUsed = 0;

  try {
    const [dailySnap, userSnap] = await Promise.all([getDoc(dailyRef), getDoc(userRef)]);
    if (dailySnap.exists()) dailyCount = dailySnap.data().count || 0;
    if (userSnap.exists()) lastUsed = userSnap.data().last || 0;
  } catch (e) {
    console.error("⚠️ Firestore 讀取錯誤：", e);
    return { allowed: false, reason: "db_error" };
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

  // ✅ 通過檢查，更新 Firestore 計數器
  try {
    await Promise.all([
      setDoc(dailyRef, { count: dailyCount + 1 }, { merge: true }),
      setDoc(userRef, { last: now }, { merge: true }),
    ]);
  } catch (e) {
    console.error("⚠️ Firestore 寫入錯誤：", e);
  }

  return { allowed: true, remaining: limit - (dailyCount + 1) };
}
