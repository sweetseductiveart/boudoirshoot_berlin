// Vercel Serverless Function - DELETE /api/delete-booking
// Löscht eine Buchung aus dem Master-Kalender

import { google } from 'googleapis';

const getServiceAccountAuth = () => {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    
    return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar.events']
    });
};

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
        const auth = getServiceAccountAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        const calendarId = process.env.MASTER_CALENDAR_ID;
        
        const { eventId } = req.method === 'DELETE' ? req.query : req.body;
        
        if (!eventId) {
            return res.status(400).json({ success: false, error: 'Event ID required' });
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
