// Vercel Serverless Function: /api/log-visitor.js
// 這個檔案用於代理訪客記錄請求，隱藏真正的 Google Apps Script 端點

export default async function handler(req, res) {
    // 只允許 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0] ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            'unknown';

        // 取得國家資訊（透過伺服器端呼叫，不暴露給前端）
        let country = 'Unknown';
        try {
            const geoRes = await fetch(`https://ipapi.co/${clientIP}/country_name/`);
            if (geoRes.ok) {
                country = await geoRes.text();
            }
        } catch (geoErr) {
            console.error('Geo lookup failed:', geoErr);
        }

        // 準備發送到 Google Apps Script 的資料
        const payload = {
            ip: clientIP,
            country: country,
            userAgent: req.body.userAgent || '',
            page: req.body.page || '',
            referrer: req.body.referrer || '',
            timestamp: req.body.timestamp || new Date().toISOString()
        };

        // 🔒 Google Apps Script 端點（只存在於伺服器端，不暴露給前端）
        const GAS_ENDPOINT = process.env.GAS_VISITOR_LOG_URL || 'https://script.google.com/macros/s/AKfycbypamhGa0ZHNzhLeG-FxH0bfFe4RU-rDHoK4V4qYXF8H9-Ut6AUU1LG_gq6yAw1Rqa5/exec';

        const response = await fetch(GAS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Visitor log error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
