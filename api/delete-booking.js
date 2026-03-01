// Vercel Serverless Function - DELETE /api/delete-booking
// Löscht eine Buchung aus dem Master-Kalender

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
    
    // Check if user is admin
    const user = users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
    return {
        isAdmin: user?.isAdmin === true,
        allowNonAdminModifications: config.ALLOW_NON_ADMIN_MODIFICATIONS !== false
    };
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
    
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        const { eventId, userEmail } = req.method === 'DELETE' ? req.query : req.body;
        
        if (!userEmail) {
            return res.status(400).json({ success: false, error: 'User email required' });
        }
        
        if (!eventId) {
            return res.status(400).json({ success: false, error: 'Event ID required' });
        }
        
        const auth = getServiceAccountAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        const calendarId = process.env.MASTER_CALENDAR_ID;
        
        // Get existing event to check ownership
        const existingEvent = await calendar.events.get({
            calendarId,
            eventId
        });
        
        const bookingOwnerEmail = existingEvent.data.extendedProperties?.private?.userEmail || 
                                  existingEvent.data.creator?.email;
        
        // Check permission
        const permissions = await checkAdminPermission(userEmail);
        const isOwner = bookingOwnerEmail && 
                       bookingOwnerEmail.toLowerCase() === userEmail.toLowerCase();
        
        if (!permissions.isAdmin && !isOwner) {
            return res.status(403).json({ 
                success: false, 
                error: 'You can only delete your own bookings' 
            });
        }
        
        await calendar.events.delete({
            calendarId,
            eventId
        });
        
        res.status(200).json({
            success: true,
            message: 'Booking deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
