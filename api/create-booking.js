// Vercel Serverless Function - POST /api/create-booking
// Erstellt eine neue Buchung im Master-Kalender

import { google } from 'googleapis';
import crypto from 'crypto';

const getServiceAccountAuth = () => {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    
    return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar.events']
    });
};

function decryptData(encryptedData, secret) {
    try {
        const [ivHex, encrypted] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        
        const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            crypto.scryptSync(secret, 'salt', 32),
            iv
        );
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt config');
    }
}

async function checkAdminPermission(userEmail) {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) {
        throw new Error('Missing ENCRYPTION_SECRET');
    }

    const githubRawUrl = 'https://raw.githubusercontent.com/sweetseductiveart/boudoirshoot_berlin/main/config/authorized-users.encrypted.json';
    const response = await fetch(githubRawUrl);
    
    if (!response.ok) {
        throw new Error('Failed to load config');
    }
    
    const encryptedFile = await response.json();
    const decryptedData = decryptData(encryptedFile.encrypted, secret);
    
    const config = decryptedData.config || {};
    const users = decryptedData.users || decryptedData;
    
    // If non-admin modifications are allowed, everyone can modify
    if (config.ALLOW_NON_ADMIN_MODIFICATIONS !== false) {
        return true;
    }
    
    // Otherwise, check if user is admin
    const user = users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
    return user?.isAdmin === true;
}

export default async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        const { event, userEmail } = req.body;
        
        if (!userEmail) {
            return res.status(400).json({ success: false, error: 'User email required' });
        }
        
        // Check admin permission
        const hasPermission = await checkAdminPermission(userEmail);
        if (!hasPermission) {
            return res.status(403).json({ 
                success: false, 
                error: 'Only admins can create bookings when modifications are restricted' 
            });
        }
        
        const auth = getServiceAccountAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        const calendarId = process.env.MASTER_CALENDAR_ID;
        
        if (!event) {
            return res.status(400).json({ success: false, error: 'Event data required' });
        }
        
        const response = await calendar.events.insert({
            calendarId,
            resource: event
        });
        
        res.status(200).json({
            success: true,
            event: response.data
        });
        
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
